import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAnalyses } from '@/lib/api/client';
import { bandColor, formatDate } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { analyses } = await getAnalyses().catch(() => ({ analyses: [] }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        subtitle="Every analysis you have uploaded, newest first"
      />

      <Card>
        <CardHeader>
          <CardSubtitle>{analyses.length} analyses</CardSubtitle>
          <CardTitle>Statements on file</CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <p className="text-meta text-text-secondary">
              No analyses yet. Upload a bank statement from the Overview page.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-meta-sm">
                <thead>
                  <tr className="border-b border-border text-meta-sm uppercase tracking-wider text-text-secondary">
                    <th className="py-2 pr-4 text-left font-medium">Date</th>
                    <th className="py-2 pr-4 text-left font-medium">Statement</th>
                    <th className="py-2 pr-4 text-left font-medium">Score</th>
                    <th className="py-2 pr-4 text-left font-medium">Status</th>
                    <th className="py-2 pr-4 text-left font-medium">Period</th>
                    <th className="py-2 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((a) => {
                    const colors = bandColor(a.band);
                    return (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 text-text-secondary tabular-nums">
                          {formatDate(a.completedAt, 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="inline-flex items-center gap-2 font-medium text-text-primary">
                            <FileText className="h-3.5 w-3.5 text-text-secondary" />
                            {a.filename}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`tabular-nums font-semibold ${colors.text}`}>
                            {a.score ?? '—'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-meta-sm font-medium ${colors.text} ${colors.bg}`}>
                            {a.band}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary">
                          {formatDate(a.periodStart, 'MMM yyyy')} – {formatDate(a.periodEnd, 'MMM yyyy')}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/analysis/${a.id}`}
                            className="font-medium text-brand-bright hover:text-brand"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
