import Link from 'next/link';
import { ArrowRight, AlertTriangle, FileText, History } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { PillarCard } from '@/components/dashboard/pillar-card';
import { AgentPulse } from '@/components/dashboard/agent-pulse';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { RerunAgentsButton } from '@/components/dashboard/rerun-agents-button';
import { UploadZone } from '@/components/upload/upload-zone';
import { getLatestOverview, getAnalyses, getAudit } from '@/lib/api/client';
import { bandColor, formatDate, formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch the latest analysis + recent activity in parallel. The /api/audit
  // call pulls recommendations + watch events + last agent run for the
  // "what changed" strip below the score.
  const [overview, list, audit] = await Promise.all([
    getLatestOverview().catch(() => null),
    getAnalyses().catch(() => ({ analyses: [] })),
    getAudit('all', 10).catch(
      (): import('@/lib/api/types').AuditResponse => ({}),
    ),
  ]);

  if (!overview) {
    return <EmptyDashboard recentCount={list.analyses.length} />;
  }

  const latestRun = audit.agentRuns?.[0];
  const recs = audit.recommendations ?? [];
  const watches = audit.watchEvents ?? [];
  const anomalies = overview.anomalies.details ?? [];
  const agentRuns = audit.agentRuns ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Your business financial health at a glance"
        action={<RerunAgentsButton />}
      />

      {/* Agent pulse — the "AI is working" centerpiece */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-meta-sm font-semibold uppercase tracking-wider text-text-secondary">
            Agents
          </h2>
          <span className="text-meta-sm text-text-secondary">· live</span>
        </div>
        <AgentPulse runs={agentRuns} />
      </div>

      {/* Top row: score + 5 pillars */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:row-span-2 overflow-hidden">
          <CardHeader>
            <CardSubtitle>Financial Health Score</CardSubtitle>
            <CardTitle>{overview.band}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <ScoreGauge score={overview.score} band={overview.band} size={280} />
            <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-border pt-4">
              <Stat label="Months" value={formatNumber(overview.monthsAnalyzed)} />
              <Stat label="Currency" value={overview.currency} />
              <Stat label="Confidence" value={`${Math.round((overview.confidence ?? 0) * 100)}%`} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2 xl:grid-cols-3">
          {overview.pillars.map((p) => (
            <PillarCard key={p.id} pillar={p} />
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardSubtitle>Monthly financial trend</CardSubtitle>
            <CardTitle>
              {formatDate(overview.periodStart, 'MMM yyyy')} – {formatDate(overview.periodEnd, 'MMM yyyy')}
            </CardTitle>
          </div>
          <Badge tone="neutral">{overview.monthsAnalyzed} months</Badge>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={overview.monthly} currency={overview.currency} />
        </CardContent>
      </Card>

      {/* Anomalies + recommendations side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Attention needed</CardSubtitle>
            <CardTitle>Anomalies &amp; risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.length === 0 ? (
              <p className="text-meta text-text-secondary">
                No anomalies detected. The deterministic engine did not flag any
                risk patterns in the {overview.monthsAnalyzed}-month window.
              </p>
            ) : (
              anomalies.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-canvas px-3.5 py-2.5"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-band-watch" />
                  <div className="min-w-0 flex-1">
                    <div className="text-meta-sm font-medium text-text-primary">
                      {a.kind.replace(/_/g, ' ')}
                    </div>
                    <p className="mt-0.5 text-meta-sm text-text-secondary">{a.description}</p>
                  </div>
                </div>
              ))
            )}
            {overview.anomalies.returnedPayments ? (
              <SummaryStat
                label="Returned payments"
                value={formatNumber(overview.anomalies.returnedPayments)}
              />
            ) : null}
            {overview.anomalies.overdraftDays ? (
              <SummaryStat
                label="Overdraft days"
                value={formatNumber(overview.anomalies.overdraftDays)}
              />
            ) : null}
            {overview.anomalies.structuralBreaks ? (
              <SummaryStat
                label="Structural breaks"
                value={formatNumber(overview.anomalies.structuralBreaks)}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardSubtitle>AI recommendations</CardSubtitle>
              <CardTitle>What the agents suggest</CardTitle>
            </div>
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand-bright hover:text-brand"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recs.length === 0 ? (
              <p className="text-meta text-text-secondary">
                No recommendations yet. The Insight agent will run automatically the next time
                you upload an analysis.
              </p>
            ) : (
              recs.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-canvas px-3.5 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-meta-sm font-semibold text-text-primary">{r.action}</div>
                    <Badge tone="brand">P{r.priority}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-meta-sm text-text-secondary">{r.rationale}</p>
                </div>
              ))
            )}
            {watches.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="text-meta-sm font-semibold text-text-primary">
                  Watcher noticed
                </div>
                {watches.slice(0, 1).map((w) => (
                  <p key={w.id} className="mt-0.5 text-meta-sm text-text-secondary">
                    {w.summary}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Recent analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardSubtitle>Recent analyses</CardSubtitle>
            <CardTitle>History</CardTitle>
          </div>
          <Link href="/history">
            <Button variant="ghost" size="sm">All <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {list.analyses.length === 0 ? (
            <p className="text-meta text-text-secondary">No analyses yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.analyses.slice(0, 5).map((a) => {
                const colors = bandColor(a.band);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-meta-sm font-medium text-text-primary">
                        <FileText className="h-3.5 w-3.5 text-text-secondary" />
                        {a.filename}
                      </div>
                      <div className="text-meta-sm text-text-secondary">
                        {formatDate(a.periodStart)} – {formatDate(a.periodEnd)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={a.band?.toLowerCase() === 'critical' ? 'negative' : a.band?.toLowerCase() === 'fragile' ? 'warning' : 'positive'}>
                        {a.score ?? '—'} · {a.band}
                      </Badge>
                      <Link
                        href={`/analysis/${a.id}`}
                        className="text-meta-sm font-medium text-brand-bright hover:text-brand"
                      >
                        View →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-meta-sm uppercase tracking-wider text-text-secondary">{label}</div>
      <div className="mt-0.5 text-body font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-meta-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums font-medium text-text-primary">{value}</span>
    </div>
  );
}

function EmptyDashboard({ recentCount }: { recentCount: number }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Your business financial health at a glance"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-h2 font-bold tracking-tight text-brand-navy">
            No financial analysis yet
          </h2>
          <p className="mt-2 max-w-prose text-body text-text-secondary">
            Upload your first bank statement to see your business's health across five pillars,
            get ranked recommendations from the AI agents, and check funding readiness against
            real Caribbean programs.
          </p>
          <div className="mt-6">
            <UploadZone />
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-meta-sm uppercase tracking-wider text-text-secondary">
            <History className="h-3.5 w-3.5" />
            What happens after upload
          </div>
          <ol className="mt-4 space-y-3 text-meta">
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">1</span>
              <span>The CSV is parsed and transactions are normalised.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">2</span>
              <span>The deterministic engine produces your 5-pillar score.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">3</span>
              <span>Three real AI agents run on the analysis (Watcher, Insight, Funding).</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">4</span>
              <span>You'll see the score, recommendations, and funding options here.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
