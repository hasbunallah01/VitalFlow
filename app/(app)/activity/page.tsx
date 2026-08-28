import Link from 'next/link';
import { Activity as ActivityIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { getAudit } from '@/lib/api/client';
import { formatDate, timeAgo, outreachStatusTokens } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

const AGENT_TONE: Record<string, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  watcher: 'warning',
  insight: 'brand',
  'funding-outreach': 'success',
};

const AGENT_LABEL: Record<string, string> = {
  watcher: 'Watcher',
  insight: 'Insight',
  'funding-outreach': 'Funding Outreach',
};

export default async function ActivityPage() {
  const audit = await getAudit('all', 200).catch(
    () => ({} as import('@/lib/api/types').AuditResponse),
  );
  const runs = audit.agentRuns ?? [];
  const watches = audit.watchEvents ?? [];
  const recs = audit.recommendations ?? [];
  const outreaches = audit.fundingOutreach ?? [];

  const items: Array<{
    id: string;
    kind: 'agent' | 'watch' | 'recommendation' | 'outreach';
    title: string;
    body: string;
    when: string;
    badge?: { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' };
    durationMs?: number;
    model?: string | null;
  }> = [];

  for (const r of runs) {
    items.push({
      id: r.id,
      kind: 'agent',
      title: `${AGENT_LABEL[r.agent] ?? r.agent} run`,
      body: `Status: ${r.status}`,
      when: r.startedAt,
      badge: { label: r.status, tone: AGENT_TONE[r.agent] ?? 'neutral' },
      durationMs: r.durationMs ?? undefined,
      model: r.model,
    });
  }
  for (const w of watches) {
    items.push({
      id: w.id,
      kind: 'watch',
      title: w.eventType.replace(/_/g, ' '),
      body: w.summary,
      when: w.createdAt,
      badge: { label: 'watch', tone: 'warning' },
    });
  }
  for (const r of recs) {
    items.push({
      id: r.id,
      kind: 'recommendation',
      title: r.action,
      body: r.rationale,
      when: r.id,
      badge: { label: `P${r.priority}`, tone: 'brand' },
    });
  }
  for (const o of outreaches) {
    const tokens = outreachStatusTokens(o.status);
    items.push({
      id: o.id,
      kind: 'outreach',
      title: o.planHeadline || 'Funding outreach',
      body:
        o.eligibleCount + (o.almostCount ? `+${o.almostCount} almost` : '') +
        ` · ${o.programNames.length} programs`,
      when: o.draftedAt,
      badge: { label: o.status, tone: tokens.text.includes('success') ? 'success' : tokens.text.includes('warning') ? 'warning' : 'brand' },
    });
  }

  items.sort((a, b) => {
    const ta = new Date(a.when).getTime() || 0;
    const tb = new Date(b.when).getTime() || 0;
    return tb - ta;
  });

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Activity</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Every agent run, observation, and recommendation — in one auditable feed.
          </p>
        </div>
        <EmptyState
          icon={<ActivityIcon className="h-7 w-7" />}
          title="No activity yet"
          description="Run an analysis to see the audit trail fill up."
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
        <h1 className="text-h1 font-bold tracking-tight text-text-primary">Activity</h1>
        <p className="mt-1.5 text-body text-text-secondary">
          {items.length} {items.length === 1 ? 'event' : 'events'} · every action is auditable
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="hidden border-b border-border bg-canvas/40 px-5 py-3 text-label-sm font-semibold uppercase tracking-wider text-text-secondary md:grid md:grid-cols-[160px_180px_1fr_120px_100px] md:gap-4">
            <span>Time</span>
            <span>Type</span>
            <span>Event</span>
            <span>Status</span>
            <span>Duration</span>
          </div>
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={`${i.kind}-${i.id}`} className="px-5 py-4">
                <div className="grid gap-2 md:grid-cols-[160px_180px_1fr_120px_100px] md:items-center md:gap-4">
                  <div>
                    <div className="text-label-sm text-text-primary">
                      {formatDate(i.when, 'MMM d, yyyy · HH:mm')}
                    </div>
                    <div className="text-micro text-text-muted">{timeAgo(i.when)}</div>
                  </div>
                  <div>
                    <Badge tone={i.badge?.tone ?? 'neutral'}>{kindLabel(i.kind)}</Badge>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-body-sm font-semibold capitalize text-text-primary">
                      {i.title}
                    </div>
                    <div className="truncate text-label-sm text-text-secondary">
                      {i.body}
                      {i.model ? (
                        <span className="ml-1 font-mono text-micro text-text-muted">
                          ({i.model})
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    {i.badge ? <Badge tone={i.badge.tone}>{i.badge.label}</Badge> : null}
                  </div>
                  <div className="text-label-sm tabular-nums text-text-secondary">
                    {i.durationMs != null ? `${i.durationMs}ms` : '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function kindLabel(kind: 'agent' | 'watch' | 'recommendation' | 'outreach'): string {
  switch (kind) {
    case 'agent': return 'Agent';
    case 'watch': return 'Watch';
    case 'recommendation': return 'Rec';
    case 'outreach': return 'Outreach';
  }
}
