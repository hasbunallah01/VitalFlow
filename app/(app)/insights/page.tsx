import Link from 'next/link';
import { AlertTriangle, ChevronRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getAudit } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'financial', label: 'Financial' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'risk', label: 'Risk' },
  { key: 'funding', label: 'Funding' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function bucketPillar(pillar: string | null | undefined): FilterKey {
  const p = (pillar ?? '').toLowerCase();
  if (p.includes('revenue')) return 'revenue';
  if (p.includes('expense')) return 'expenses';
  if (p.includes('risk')) return 'risk';
  if (p.includes('liquidity') || p.includes('cash_flow')) return 'financial';
  return 'financial';
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (FILTERS.find((f) => f.key === rawFilter)?.key ??
    'all') as FilterKey;

  const audit = await getAudit('all', 200).catch(() => ({}) as import('@/lib/api/types').AuditResponse);
  const recs = (audit.recommendations ?? []).map((r) => ({
    id: r.id,
    kind: 'recommendation' as const,
    title: r.action,
    body: r.rationale,
    pillar: r.pillar,
    priority: r.priority,
    bucket: bucketPillar(r.pillar),
    effort: r.effort,
    timeframe: r.timeframe,
    estimatedPointGain: r.estimatedPointGain,
    createdAt: r.id,
  }));
  const watches = (audit.watchEvents ?? []).map((w) => ({
    id: w.id,
    kind: 'watch' as const,
    title: w.eventType.replace(/_/g, ' '),
    body: w.summary,
    pillar: null,
    priority: 3,
    bucket: 'risk' as FilterKey,
    createdAt: w.createdAt,
  }));

  const all = [...recs, ...watches].sort(
    (a, b) => (a.priority ?? 3) - (b.priority ?? 3),
  );
  const filtered = filter === 'all' ? all : all.filter((i) => i.bucket === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Insights</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          AI observations and recommended actions from your latest analysis.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const href = f.key === 'all' ? '/insights' : `/insights?filter=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={
                active
                  ? 'inline-flex h-9 items-center rounded-pill bg-brand px-3.5 text-label font-medium text-white'
                  : 'inline-flex h-9 items-center rounded-pill border border-border bg-card px-3.5 text-label font-medium text-text-secondary hover:text-text-primary'
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-7 w-7" />}
          title="No insights here yet"
          description="Run the agents from the Analysis page to generate observations and recommendations."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <Card key={`${i.kind}-${i.id}`}>
              <CardContent>
                <div className="flex items-start gap-3">
                  <span
                    className={
                      i.kind === 'watch'
                        ? 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-soft bg-warning-muted text-warning'
                        : 'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-soft bg-brand/10 text-brand'
                    }
                  >
                    {i.kind === 'watch' ? <AlertTriangle className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-h5 font-semibold capitalize text-text-primary">
                        {i.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {i.kind === 'recommendation' ? <Badge tone="brand">Recommendation</Badge> : <Badge tone="warning">Watch</Badge>}
                        {i.pillar ? <Badge tone="neutral">{i.pillar}</Badge> : null}
                        <Badge tone="brand">P{i.priority}</Badge>
                      </div>
                    </div>
                    <p className="mt-1.5 text-body-sm text-text-secondary">{i.body}</p>
                    {i.kind === 'recommendation' ? (
                      <div className="mt-2 grid gap-3 text-label-sm text-text-secondary sm:grid-cols-3">
                        <span><span className="text-text-muted">Effort:</span> {i.effort}</span>
                        <span><span className="text-text-muted">Timeframe:</span> {i.timeframe}</span>
                        {i.estimatedPointGain != null ? (
                          <span>
                            <span className="text-text-muted">Expected gain:</span>{' '}
                            <span className="font-semibold text-success">
                              +{i.estimatedPointGain.toFixed(1)} pts
                            </span>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
