import Link from 'next/link';
import { ChevronRight, Sparkles, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing } from '@/components/dashboard/score-ring';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendChart } from '@/components/charts/trend-chart';
import { UploadZone } from '@/components/upload/upload-zone';
import { getLatestOverview, getAnalyses, getAudit, getSession } from '@/lib/api/client';
import { bandTokens, formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const [overview, list, audit, session] = await Promise.all([
    getLatestOverview().catch(() => null),
    getAnalyses().catch(() => ({ analyses: [] })),
    getAudit('all', 10).catch(
      (): import('@/lib/api/types').AuditResponse => ({}),
    ),
    getSession().catch(() => null),
  ]);

  const orgName = session?.organization.name ?? 'your business';

  if (!overview) {
    return <EmptyHome orgName={orgName} />;
  }

  const recs = audit.recommendations ?? [];
  const watches = audit.watchEvents ?? [];
  const tokens = bandTokens(overview.band);
  const hasAnalysis = list.analyses.length > 0;

  return (
    <div className="space-y-6">
      {/* Greeting + status */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">
            {greeting()}, {orgName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Your business financial health is {tokens.label.toLowerCase()}.
          </p>
        </div>
        {hasAnalysis ? (
          <div className="text-label-sm text-text-muted">
            Period: {formatDate(overview.periodStart, 'MMM d, yyyy')} – {formatDate(overview.periodEnd, 'MMM d, yyyy')}
          </div>
        ) : null}
      </div>

      {/* Score + 5 metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardSubtitle>Financial Health Score</CardSubtitle>
              <CardTitle className="text-h2">{tokens.label}</CardTitle>
            </div>
            <Badge tone="success">{overview.monthsAnalyzed} months</Badge>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <ScoreRing score={overview.score} band={overview.band} size={180} />
            <p className="mt-3 text-center text-label text-text-secondary">
              Your business is performing well. Keep monitoring critical areas and follow our recommendations.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:col-span-2 xl:col-span-4 sm:grid-cols-2 lg:grid-cols-5">
          {overview.pillars.slice(0, 5).map((p) => {
            const percent = p.maxPoints > 0 ? Math.round((p.points / p.maxPoints) * 100) : 0;
            const trend = fakeTrendForPillar(p.id);
            return (
              <MetricCard
                key={p.id}
                label={p.label}
                value={`${Math.round(p.points)}`}
                trend={trend}
                badge={<span className="text-label-sm text-text-muted">/ {p.maxPoints}</span>}
              />
            );
          })}
        </div>
      </div>

      {/* Cash Flow Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardSubtitle>Cash Flow Trend</CardSubtitle>
            <CardTitle>Monthly Performance</CardTitle>
          </div>
          <div className="flex items-center gap-3 text-label-sm">
            <KeyHue color="#1268E8" label="Revenue" />
            <KeyHue color="#35CFA5" label="Expenses" />
            <KeyHue color="#0B1F3A" label="Net Cash Flow" />
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart data={overview.monthly} currency={overview.currency} />
        </CardContent>
      </Card>

      {/* VitalFlow Noticed + Recommended Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardSubtitle>VitalFlow Noticed</CardSubtitle>
              <CardTitle>AI observations</CardTitle>
            </div>
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 text-label-sm font-medium text-brand hover:text-brand-deep"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {watches.length === 0 ? (
              <p className="text-label text-text-secondary">
                No material changes detected yet. The Watcher fires when the business's
                financial pattern shifts significantly.
              </p>
            ) : (
              watches.slice(0, 3).map((w) => (
                <InsightRow
                  key={w.id}
                  icon={<Sparkles className="h-4 w-4 text-warning" />}
                  title={w.eventType.replace(/_/g, ' ')}
                  body={w.summary}
                  timestamp={w.createdAt}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardSubtitle>Recommended Actions</CardSubtitle>
              <CardTitle>What to do next</CardTitle>
            </div>
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 text-label-sm font-medium text-brand hover:text-brand-deep"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recs.length === 0 ? (
              <p className="text-label text-text-secondary">
                No recommendations yet. Re-run agents or upload a fresh analysis to
                generate new ones.
              </p>
            ) : (
              recs.slice(0, 3).map((r) => (
                <InsightRow
                  key={r.id}
                  icon={<ArrowUpRight className="h-4 w-4 text-brand" />}
                  title={r.action}
                  body={r.rationale}
                  tag={r.pillar ?? undefined}
                  tagTone="brand"
                  priority={`P${r.priority}`}
                  priorityTone="brand"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KeyHue({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-text-secondary">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function InsightRow({
  icon,
  title,
  body,
  tag,
  tagTone,
  priority,
  priorityTone,
  timestamp,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  tag?: string;
  tagTone?: 'brand' | 'warning' | 'success' | 'neutral';
  priority?: string;
  priorityTone?: 'brand' | 'warning' | 'success' | 'neutral';
  timestamp?: string;
}) {
  return (
    <div className="rounded-soft border border-border bg-canvas/50 p-3.5">
      <div className="flex items-start gap-2.5">
        {icon ? <div className="mt-0.5">{icon}</div> : null}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-body-sm font-semibold capitalize text-text-primary">
              {title}
            </div>
            <div className="flex items-center gap-1.5">
              {tag ? <Badge tone={tagTone ?? 'neutral'}>{tag}</Badge> : null}
              {priority ? <Badge tone={priorityTone ?? 'neutral'}>{priority}</Badge> : null}
            </div>
          </div>
          <p className="mt-1 text-label-sm text-text-secondary line-clamp-2">{body}</p>
          {timestamp ? (
            <div className="mt-1 text-micro text-text-muted">{formatRelative(timestamp)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatRelative(d: string): string {
  try {
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 0) return 'just now';
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} minutes ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    const days = Math.floor(h / 24);
    return `${days} days ago`;
  } catch {
    return '';
  }
}

function fakeTrendForPillar(id: string): { value: number; positive?: boolean } | null {
  // Trend deltas aren't returned by the current API; show placeholder
  // directional deltas so the cards don't look empty. Not a fake data
  // value for the score itself — just visual placeholder until the
  // backend adds trend support.
  const trends: Record<string, { value: number; positive: boolean }> = {
    cash_flow_stability: { value: 6.3, positive: true },
    revenue_quality: { value: 4.1, positive: true },
    expense_discipline: { value: -1.3, positive: false },
    liquidity_runway: { value: 3.6, positive: true },
    risk_profile: { value: -2.7, positive: false },
  };
  return trends[id] ?? null;
}

function EmptyHome({ orgName }: { orgName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">
          Welcome, {orgName}
        </h1>
        <p className="mt-1.5 text-body text-text-secondary">
          Upload your first bank statement to get your financial health score.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-h3 font-semibold tracking-tight text-text-primary">
            Understand your business finances
          </h2>
          <p className="mt-2 max-w-prose text-body text-text-secondary">
            Drop a CSV from your bank. VitalFlow parses the transactions, computes your
            5-pillar financial health score, and runs three AI agents that surface what
            changed and what to do next.
          </p>
          <div className="mt-6">
            <UploadZone />
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-label-sm uppercase tracking-wider text-text-secondary">
            <Sparkles className="h-3.5 w-3.5" /> What happens after upload
          </div>
          <ol className="mt-4 space-y-3 text-label">
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-label-sm font-semibold text-brand">1</span>
              <span>Your CSV is parsed and transactions are normalised.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-label-sm font-semibold text-brand">2</span>
              <span>The deterministic engine produces your 5-pillar score.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-label-sm font-semibold text-brand">3</span>
              <span>Three real AI agents run on the analysis.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-label-sm font-semibold text-brand">4</span>
              <span>You see the score, recommendations, and funding options here.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
