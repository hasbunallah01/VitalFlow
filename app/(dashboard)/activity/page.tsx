import Link from 'next/link';
import { ArrowRight, Eye, Lightbulb, Wallet, FileText, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAudit } from '@/lib/api/client';
import { timeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  // The Activity page is the user-facing timeline. It shows:
  //   - Watcher events ("VitalFlow noticed …")
  //   - Recommendations ("We recommend …")
  //   - Funding drafts ("Funding agent identified …")
  //   - Analyses as "uploads"
  // Sorted newest first. The technical AgentRun ledger lives at /audit.
  const audit = await getAudit('all', 100).catch(
    (): import('@/lib/api/types').AuditResponse => ({}),
  );
  const watches = audit.watchEvents ?? [];
  const recs = audit.recommendations ?? [];
  const funding = audit.fundingOutreach ?? [];
  const analyses = audit.analyses ?? [];

  type Item = {
    id: string;
    kind: 'watch' | 'recommendation' | 'funding' | 'analysis';
    icon: typeof Eye;
    title: string;
    description: string;
    timestamp: string;
    badge?: { label: string; tone: 'brand' | 'positive' | 'warning' };
    href?: string;
  };

  const items: Item[] = [];

  for (const a of analyses) {
    items.push({
      id: 'a-' + a.id,
      kind: 'analysis',
      icon: FileText,
      title: `Analysis completed — ${a.filename}`,
      description: `Score ${a.score} · ${a.band}`,
      timestamp: a.completedAt ?? '',
      badge: { label: a.band ?? '—', tone: 'brand' },
      href: `/analysis/${a.id}`,
    });
  }
  for (const w of watches) {
    items.push({
      id: 'w-' + w.id,
      kind: 'watch',
      icon: Eye,
      title: 'VitalFlow noticed something',
      description: w.summary,
      timestamp: w.createdAt,
      badge: { label: w.eventType.replace(/_/g, ' '), tone: 'warning' },
    });
  }
  for (const r of recs) {
    items.push({
      id: 'r-' + r.id,
      kind: 'recommendation',
      icon: Lightbulb,
      title: r.action,
      description: r.rationale,
      timestamp: r.timeframe, // recs don't carry a createdAt in the response shape
      badge: { label: `Priority ${r.priority}`, tone: 'positive' },
      href: '/insights',
    });
  }
  for (const f of funding) {
    items.push({
      id: 'f-' + f.id,
      kind: 'funding',
      icon: Wallet,
      title: f.planHeadline ?? 'Funding opportunity drafted',
      description: f.planSummary ?? `${f.eligibleCount} eligible programs identified`,
      timestamp: f.draftedAt,
      badge: { label: f.status, tone: 'brand' },
      href: `/funding/${f.id}`,
    });
  }

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        subtitle="What VitalFlow's agents noticed, drafted, and recommended — in chronological order"
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <KPI label="Analyses" value={analyses.length} icon={FileText} />
        <KPI label="Watcher events" value={watches.length} icon={Eye} />
        <KPI label="Recommendations" value={recs.length} icon={Lightbulb} />
        <KPI label="Funding drafts" value={funding.length} icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardSubtitle>Timeline</CardSubtitle>
          <CardTitle>VitalFlow's recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-soft border border-dashed border-border bg-canvas/50 px-4 py-10 text-center text-meta text-text-secondary">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-text-secondary" />
              No activity yet. Upload a bank statement and the agents will start working.
            </div>
          ) : (
            <ol className="relative space-y-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-border">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[18px] top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-brand text-white">
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                    <Link
                      href={it.href ?? '#'}
                      className="block rounded-soft border border-border bg-card p-3.5 shadow-card transition-shadow hover:shadow-card-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-meta-sm font-semibold text-text-primary">
                            {it.title}
                          </div>
                          <p className="mt-1 line-clamp-2 text-meta text-text-secondary">
                            {it.description}
                          </p>
                        </div>
                        {it.badge ? (
                          <Badge tone={it.badge.tone}>{it.badge.label}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-meta-sm text-text-secondary">
                        <span>{timeAgo(it.timestamp)}</span>
                        {it.href ? (
                          <span className="inline-flex items-center gap-0.5 font-medium text-brand">
                            Open <ArrowRight className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Eye }) {
  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-meta-sm text-text-secondary">{label}</div>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="mt-1.5 text-h2 font-bold text-text-primary tabular-nums">{value}</div>
    </div>
  );
}
