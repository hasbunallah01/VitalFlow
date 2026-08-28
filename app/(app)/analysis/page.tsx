import Link from 'next/link';
import { ChevronRight, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { UploadZone } from '@/components/upload/upload-zone';
import { getAnalyses } from '@/lib/api/client';
import { formatDate, formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function AnalysisIndexPage() {
  const list = await getAnalyses().catch(() => ({ analyses: [] }));
  const latest = list.analyses[0];

  if (!latest) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Analysis</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Run your first analysis by uploading a bank statement.
          </p>
        </div>
        <UploadZone />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Analysis</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            {list.analyses.length} {list.analyses.length === 1 ? 'analysis' : 'analyses'} ·
            {' '}Latest: {formatDate(latest.periodStart, 'MMM d, yyyy')} – {formatDate(latest.periodEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/analysis/${latest.id}`}>
            <Button variant="secondary" size="md">
              <RefreshCw className="h-4 w-4" /> Open latest
            </Button>
          </Link>
          <Link href="#upload">
            <Button size="md">
              <Upload className="h-4 w-4" /> New analysis
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {list.analyses.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/analysis/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-canvas"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body-sm font-semibold text-text-primary">
                      {a.filename}
                    </div>
                    <div className="mt-0.5 text-label-sm text-text-secondary">
                      {formatDate(a.periodStart, 'MMM d, yyyy')} – {formatDate(a.periodEnd, 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-num-sm font-bold text-text-primary tabular-nums">
                      {a.score == null ? '—' : formatNumber(a.score, { decimals: 1 })}{' '}
                      <span className="text-label-sm text-text-muted">/ 100</span>
                    </div>
                    <div className="text-label-sm text-text-secondary">{a.band}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div id="upload" className="scroll-mt-20">
        <h2 className="mb-3 text-h3 font-semibold tracking-tight text-text-primary">Upload a new statement</h2>
        <UploadZone />
      </div>
    </div>
  );
}
