import Link from 'next/link';
import { ArrowRight, AlertTriangle, FileText, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { PillarCard } from '@/components/dashboard/pillar-card';
import { AgentPulse } from '@/components/dashboard/agent-pulse';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { RerunAgentsButton } from '@/components/dashboard/rerun-agents-button';
import { UploadZone } from '@/components/upload/upload-zone';
import { getLatestOverview, getAnalyses, getAudit, getSession } from '@/lib/api/client';
import { formatDate, formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
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
    return <EmptyDashboard orgName={orgName} />;
  }

  const recs = audit.recommendations ?? [];
  const watches = audit.watchEvents ?? [];
  const anomalies = overview.anomalies.details ?? [];
  const agentRuns = audit.agentRuns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">
            {greeting()}, {orgName}
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Here&apos;s how your business is doing.
          </p>
        </div>
        <RerunAgentsButton />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-meta">
        <span className="text-text-secondary">Financial health</span>
        <Badge tone="positive" className="uppercase">{overview.band}</Badge>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">{overview.score} / 100</span>
        <span className="text-text-muted">·</span>
        <span className="text-text-secondary">
          {formatDate(overview.periodStart, 'MMM yyyy')} – {formatDate(overview.periodEnd, 'MMM yyyy')}
        </span>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-meta-sm font-semibold uppercase tracking-wider text-text-secondary">
            VitalFlow Intelligence
          </h2>
          <span className="text-meta-sm text-text-muted">· live</span>
        </div>
        <AgentPulse runs={agentRuns} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardSubtitle>Financial Health Score</CardSubtitle>
            <CardTitle>{overview.band}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0">
            <ScoreGauge score={overview.score} band={overview.band} size={260} />
            <div className="mt-6 grid w-full grid-cols-3 gap-2 border-t border-border pt-4">
              <Stat label="Months" value={formatNumber(overview.monthsAnalyzed)} />
              <Stat label="Currency" value={overview.currency} />
              <Stat label="Confidence" value={`${Math.round((overview.confidence ?? 0) * 100)}%`} />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2 xl:grid-cols-3">
          {overview.pillars.map((p) => <PillarCard key={p.id} pillar={p} />)}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardSubtitle>Cash flow</CardSubtitle>
            <CardTitle>Monthly financial trend</CardTitle>
          </div>
          <Badge tone="muted">{overview.monthsAnalyzed} months</Badge>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={overview.monthly} currency={overview.currency} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Things to watch</CardSubtitle>
            <CardTitle>Anomalies &amp; risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.length === 0 ? (
              <p className="text-meta text-text-secondary">No anomalies detected in the {overview.monthsAnalyzed}-month window.</p>
            ) : (
              anomalies.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-soft border border-border bg-canvas px-3.5 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="min-w-0 flex-1">
                    <div className="text-meta-sm font-medium capitalize text-text-primary">{a.kind.replace(/_/g, ' ')}</div>
                    <p className="mt-0.5 text-meta-sm text-text-secondary">{a.description}</p>
                  </div>
                </div>
              ))
            )}
            {overview.anomalies.returnedPayments ? <SummaryStat label="Returned payments" value={formatNumber(overview.anomalies.returnedPayments)} /> : null}
            {overview.anomalies.overdraftDays ? <SummaryStat label="Overdraft days" value={formatNumber(overview.anomalies.overdraftDays)} /> : null}
            {overview.anomalies.structuralBreaks ? <SummaryStat label="Structural breaks" value={formatNumber(overview.anomalies.structuralBreaks)} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardSubtitle>AI recommendations</CardSubtitle>
              <CardTitle>VitalFlow noticed</CardTitle>
            </div>
            <Link href="/insights" className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand hover:text-brand-deep">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recs.length === 0 ? (
              <p className="text-meta text-text-secondary">No recommendations yet. Re-run agents or upload a fresh analysis.</p>
            ) : (
              recs.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-soft border border-border bg-canvas px-3.5 py-2.5">
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
                <div className="text-meta-sm font-semibold text-text-primary">Latest Watcher event</div>
                {watches.slice(0, 1).map((w) => (
                  <p key={w.id} className="mt-0.5 text-meta-sm text-text-secondary">{w.summary}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardSubtitle>Recent analyses</CardSubtitle>
            <CardTitle>History</CardTitle>
          </div>
          <Link href="/analysis" className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand hover:text-brand-deep">
            All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {list.analyses.length === 0 ? (
            <p className="text-meta text-text-secondary">No analyses yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.analyses.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-meta-sm font-medium text-text-primary">
                      <FileText className="h-3.5 w-3.5 text-text-muted" />
                      {a.filename}
                    </div>
                    <div className="text-meta-sm text-text-secondary">{formatDate(a.periodStart)} – {formatDate(a.periodEnd)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={a.band?.toLowerCase() === 'critical' ? 'negative' : a.band?.toLowerCase() === 'fragile' ? 'warning' : 'positive'}>
                      {a.score ?? '—'} · {a.band}
                    </Badge>
                    <Link href={`/analysis/${a.id}`} className="text-meta-sm font-medium text-brand hover:text-brand-deep">View →</Link>
                  </div>
                </li>
              ))}
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
      <div className="text-meta-sm uppercase tracking-wider text-text-muted">{label}</div>
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

function EmptyDashboard({ orgName }: { orgName: string }) {
  const steps = [
    'Your CSV is parsed and transactions are normalised.',
    'The deterministic engine produces your 5-pillar score.',
    'Three real AI agents run on the analysis.',
    'You see the score, recommendations, and funding options here.',
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Welcome, {orgName}</h1>
        <p className="mt-1 text-body text-text-secondary">Upload your first bank statement to get started.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-h2 font-bold tracking-tight text-text-primary">Understand your business finances</h2>
          <p className="mt-2 max-w-prose text-body text-text-secondary">
            Drop a CSV from your bank. VitalFlow parses the transactions, computes your
            5-pillar financial health score, and runs three AI agents that surface what
            changed and what to do next.
          </p>
          <div className="mt-6"><UploadZone /></div>
        </div>
        <div className="rounded-card border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-meta-sm uppercase tracking-wider text-text-secondary">
            <Activity className="h-3.5 w-3.5" />
            What happens after upload
          </div>
          <ol className="mt-4 space-y-3 text-meta">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
