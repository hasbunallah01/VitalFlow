import { Activity, Bot, Eye, FileText, Lightbulb, ShieldCheck, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAudit } from '@/lib/api/client';
import { formatDate, timeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const AGENT_LABEL: Record<string, { label: string; icon: typeof Bot }> = {
  watcher: { label: 'Watcher Agent', icon: Eye },
  insight: { label: 'Insight Agent', icon: Lightbulb },
  'funding-outreach': { label: 'Funding Outreach Agent', icon: Wallet },
};

export default async function AuditPage() {
  const audit = await getAudit('all', 100).catch(
    (): import('@/lib/api/types').AuditResponse => ({}),
  );
  const agentRuns = audit.agentRuns ?? [];
  const watches = audit.watchEvents ?? [];
  const recs = audit.recommendations ?? [];
  const funding = audit.fundingOutreach ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity & Audit Trail"
        subtitle="Every agent run, every recommendation, every consequential decision — recorded."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Agent runs" value={agentRuns.length} icon={Bot} />
        <KPI label="Watcher events" value={watches.length} icon={Eye} />
        <KPI label="Recommendations" value={recs.length} icon={Lightbulb} />
        <KPI label="Funding drafts" value={funding.length} icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardSubtitle>Agent ledger</CardSubtitle>
          <CardTitle>Every agent invocation</CardTitle>
        </CardHeader>
        <CardContent>
          {agentRuns.length === 0 ? (
            <Empty msg="No agent runs yet. Upload a bank statement and the orchestrator will run Watcher, Insight, and Funding Outreach automatically." />
          ) : (
            <ul className="space-y-3">
              {agentRuns.map((r) => {
                const meta = AGENT_LABEL[r.agent] ?? { label: r.agent, icon: Bot };
                const Icon = meta.icon;
                return (
                  <li
                    key={r.id}
                    className="rounded-card border border-border bg-canvas p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-brand" />
                          <span className="text-h5 font-semibold text-text-primary">{meta.label}</span>
                          <Badge tone={r.status === 'completed' ? 'positive' : r.status === 'failed' ? 'negative' : 'warning'}>
                            {r.status}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta-sm text-text-secondary">
                          <span>Model · <span className="font-mono text-text-primary">{r.model ?? '—'}</span></span>
                          <span>Duration · <span className="tabular-nums text-text-primary">{r.durationMs}ms</span></span>
                          {r.tokensIn != null && r.tokensOut != null ? (
                            <span>
                              Tokens ·{' '}
                              <span className="tabular-nums text-text-primary">
                                {r.tokensIn} → {r.tokensOut}
                              </span>
                            </span>
                          ) : null}
                          <span>
                            Input ·{' '}
                            <span className="font-mono text-meta-sm text-text-primary">{r.inputHash.slice(0, 12)}</span>
                          </span>
                        </div>
                        {r.analysisScore != null ? (
                          <div className="mt-1.5 text-meta-sm text-text-secondary">
                            On analysis · <span className="tabular-nums font-medium text-text-primary">{r.analysisScore} ({r.analysisBand})</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right text-meta-sm text-text-secondary">
                        <div>{timeAgo(r.startedAt)}</div>
                        <div className="font-mono text-meta-sm">{formatDate(r.startedAt, 'MMM d, HH:mm:ss')}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Watcher</CardSubtitle>
            <CardTitle>Material changes detected</CardTitle>
          </CardHeader>
          <CardContent>
            {watches.length === 0 ? (
              <Empty msg="No Watcher events. The Watcher compares each new analysis to the business's history; an event is recorded only when something material changes." />
            ) : (
              <ul className="space-y-2">
                {watches.map((w) => (
                  <li key={w.id} className="rounded-lg border border-border bg-canvas px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="warning">{w.eventType.replace(/_/g, ' ')}</Badge>
                      <span className="text-meta-sm text-text-secondary">{timeAgo(w.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-meta text-text-primary">{w.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Insight</CardSubtitle>
            <CardTitle>Recommendations drafted</CardTitle>
          </CardHeader>
          <CardContent>
            {recs.length === 0 ? (
              <Empty msg="No recommendations yet." />
            ) : (
              <ul className="space-y-2">
                {recs.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-canvas px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-meta-sm font-semibold text-text-primary">{r.action}</span>
                      <Badge tone="brand">P{r.priority}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-meta-sm text-text-secondary">{r.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-meta-sm uppercase tracking-wider text-text-secondary">{label}</div>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div className="mt-1.5 text-number font-bold tabular-nums text-brand-navy">{value}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-canvas/50 px-4 py-6 text-center text-meta text-text-secondary">
      {msg}
    </div>
  );
}
