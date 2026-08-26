import Link from 'next/link';
import { ArrowRight, Clock, Eye, Lightbulb } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAudit } from '@/lib/api/client';
import { formatDate, timeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  // Pull everything we need in one call: agent runs (the spine), watch
  // events (the Watcher's observations), recommendations (the Insight
  // agent's output), and funding outreaches (so the user can pivot).
  const audit = await getAudit('all', 50).catch(
    (): import('@/lib/api/types').AuditResponse => ({}),
  );

  const watches = audit.watchEvents ?? [];
  const recs = audit.recommendations ?? [];
  const funding = audit.fundingOutreach ?? [];

  const observations: Array<{
    id: string;
    source: 'watcher' | 'recommendation' | 'funding';
    title: string;
    description: string;
    timestamp: string;
    extra?: { priority?: number; effort?: string; pillar?: string | null; pointGain?: number | null; programName?: string };
  }> = [];

  for (const w of watches) {
    observations.push({
      id: w.id,
      source: 'watcher',
      title: w.eventType.replace(/_/g, ' '),
      description: w.summary,
      timestamp: w.createdAt,
    });
  }
  for (const r of recs) {
    observations.push({
      id: r.id,
      source: 'recommendation',
      title: r.action,
      description: r.rationale,
      timestamp: r.timeframe, // no real timestamp on rec; use timeframe
      extra: {
        priority: r.priority,
        effort: r.effort,
        pillar: r.pillar,
        pointGain: r.estimatedPointGain,
      },
    });
  }
  for (const f of funding) {
    observations.push({
      id: f.id,
      source: 'funding',
      title: f.planHeadline ?? 'Funding outreach drafted',
      description: f.planSummary ?? 'New funding opportunities identified.',
      timestamp: f.draftedAt,
      extra: { programName: f.recommendedProgram ?? undefined },
    });
  }
  observations.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="What the AI agents noticed and what they recommend"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Recommendations"
          value={recs.length}
          tone="brand"
          href="/insights#recommendations"
        />
        <SummaryStat
          label="Watcher events"
          value={watches.length}
          tone="warning"
          href="/insights#observations"
        />
        <SummaryStat
          label="Funding drafts"
          value={funding.length}
          tone="teal"
          href="/funding"
        />
      </div>

      <Card id="observations">
        <CardHeader>
          <CardSubtitle>Observations</CardSubtitle>
          <CardTitle>What VitalFlow noticed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {observations.filter((o) => o.source === 'watcher' || o.source === 'funding').length === 0 ? (
            <Empty msg="No observations yet. The Watcher fires when material changes are detected; the Funding agent fires after each new analysis." />
          ) : (
            observations
              .filter((o) => o.source === 'watcher' || o.source === 'funding')
              .map((o) => <ObservationRow key={o.id} obs={o} />)
          )}
        </CardContent>
      </Card>

      <Card id="recommendations">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardSubtitle>Recommendations</CardSubtitle>
            <CardTitle>What VitalFlow recommends</CardTitle>
          </div>
          <Badge tone="brand">{recs.length} ranked</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {recs.length === 0 ? (
            <Empty msg="No recommendations yet. Run the Insight agent from the Overview page or upload a new analysis." />
          ) : (
            recs.map((r) => (
              <div
                key={r.id}
                className="rounded-card border border-border bg-card p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-brand" />
                      <h3 className="text-h5 font-semibold text-text-primary">{r.action}</h3>
                    </div>
                    <p className="mt-1.5 text-meta text-text-secondary">{r.rationale}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone="brand">Priority {r.priority}</Badge>
                    {r.estimatedPointGain ? (
                      <Badge tone="positive">+{r.estimatedPointGain.toFixed(1)}pt</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-meta-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {r.timeframe}
                  </span>
                  {r.pillar ? (
                    <span className="inline-flex items-center gap-1">
                      Pillar · {r.pillar}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 capitalize">
                    Effort · {r.effort}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {funding.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardSubtitle>Funding outreach</CardSubtitle>
              <CardTitle>Latest draft</CardTitle>
            </div>
            <Link
              href="/funding"
              className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand-bright hover:text-brand"
            >
              Open funding <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-meta text-text-secondary">
              {funding[0]?.planSummary ?? 'No summary available.'}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ObservationRow({ obs }: { obs: { id: string; source: 'watcher' | 'recommendation' | 'funding'; title: string; description: string; timestamp: string; extra?: { programName?: string } } }) {
  const isWatcher = obs.source === 'watcher';
  const isFunding = obs.source === 'funding';
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-canvas px-4 py-3">
      <div className="mt-0.5">
        {isWatcher ? <Eye className="h-4 w-4 text-band-watch" /> : <Lightbulb className="h-4 w-4 text-brand-teal" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-meta-sm font-semibold capitalize text-text-primary">
            {obs.title}
          </div>
          <span className="text-meta-sm text-text-secondary">{timeAgo(obs.timestamp)}</span>
        </div>
        <p className="mt-1 text-meta text-text-secondary">{obs.description}</p>
        {isFunding && obs.extra?.programName ? (
          <div className="mt-2">
            <Badge tone="teal">Recommended program · {obs.extra.programName}</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'warning' | 'teal';
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-card border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="text-meta-sm uppercase tracking-wider text-text-secondary">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-number font-bold tabular-nums text-brand-navy">{value}</span>
        <span className="text-meta text-text-secondary">total</span>
      </div>
      <div className="mt-1.5">
        <Badge tone={tone}>view →</Badge>
      </div>
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-canvas/50 px-4 py-6 text-center text-meta text-text-secondary">
      {msg}
    </div>
  );
}
