import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { getAnalyses } from '@/lib/api/client';
import { bandTokens, formatDate, formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const list = await getAnalyses().catch(() => ({ analyses: [] }));

  if (list.analyses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">History</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            All your past analyses in one place.
          </p>
        </div>
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No analyses yet"
          description="Upload your first bank statement to start building history."
          action={
            <Link href="/analysis">
              <Button>Go to Analysis</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">History</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          {list.analyses.length} {list.analyses.length === 1 ? 'analysis' : 'analyses'} · most recent first
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="hidden border-b border-border bg-canvas/40 px-5 py-3 text-label-sm font-semibold uppercase tracking-wider text-text-secondary md:grid md:grid-cols-[1fr_140px_120px_60px] md:gap-4">
            <span>File</span>
            <span>Period</span>
            <span>Score</span>
            <span className="text-right">Band</span>
          </div>
          <ul className="divide-y divide-border">
            {list.analyses.map((a) => {
              const tokens = bandTokens(a.band);
              return (
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
                    <div className="md:order-3">
                      <div className="text-num-sm font-bold tabular-nums text-text-primary">
                        {a.score == null ? '—' : formatNumber(a.score, { decimals: 1 })}{' '}
                        <span className="text-label-sm text-text-muted">/ 100</span>
                      </div>
                    </div>
                    <div className="md:order-2">
                      <Badge tone="brand">{a.band ? tokens.label : '—'}</Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted md:order-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
