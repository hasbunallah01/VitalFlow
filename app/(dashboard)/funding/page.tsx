import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFundingOutreaches } from '@/lib/api/client';
import { eligibilityColor, formatDate, outreachStatusColor, timeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function FundingPage() {
  const data = await getFundingOutreaches().catch(() => ({ fundingOutreach: [] }));
  const list = data.fundingOutreach;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funding"
        subtitle="Programs VitalFlow identified based on your business profile and financial health"
      />

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-7 w-7 text-text-secondary" />
            <div className="mt-3 text-h4 font-semibold text-text-primary">No funding drafts yet</div>
            <p className="mt-1.5 text-meta text-text-secondary">
              The Funding Outreach agent runs automatically after each new analysis. Upload a
              bank statement to generate a draft.
            </p>
          </CardContent>
        </Card>
      ) : (
        list.map((f) => {
          const statusColors = outreachStatusColor(f.status);
          return (
            <Card key={f.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardSubtitle>
                      Funding outreach · drafted {timeAgo(f.draftedAt)} by{' '}
                      <span className="font-mono text-meta-sm text-text-primary">
                        {f.draftedByModel ?? 'rule-based'}
                      </span>
                    </CardSubtitle>
                    <CardTitle className="mt-1">
                      {f.planHeadline ?? `Outreach for analysis ${f.analysisId.slice(0, 8)}…`}
                    </CardTitle>
                    {f.planSummary ? (
                      <p className="mt-2 max-w-3xl text-meta text-text-secondary">{f.planSummary}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-meta-sm font-medium capitalize ${statusColors.bg} ${statusColors.text}`}>
                      {f.status}
                    </span>
                    <Badge tone="neutral">
                      {f.eligibleCount} eligible · {f.almostCount} almost
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {f.programNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {f.programNames.map((name) => (
                      <Badge key={name} tone="muted">{name}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-meta text-text-secondary">No programs evaluated yet.</p>
                )}

                {f.readinessGap && f.readinessGap.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-meta-sm font-semibold text-text-primary">Readiness gap</div>
                    <ul className="space-y-1.5">
                      {f.readinessGap.slice(0, 4).map((g) => {
                        const c = eligibilityColor(g.status);
                        return (
                          <li
                            key={g.programId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {g.status === 'eligible' ? (
                                <CheckCircle2 className="h-4 w-4 text-positive" />
                              ) : g.status === 'blocked' ? (
                                <ShieldAlert className="h-4 w-4 text-text-secondary" />
                              ) : (
                                <ArrowRight className="h-4 w-4 text-band-watch" />
                              )}
                              <span className="truncate text-meta-sm font-medium text-text-primary">
                                {g.programName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-meta-sm font-medium ${c.text} ${c.bg}`}>
                                {g.status}
                              </span>
                              {g.totalPointsShort > 0 ? (
                                <span className="text-meta-sm tabular-nums text-text-secondary">
                                  short {g.totalPointsShort.toFixed(0)}pt
                                </span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <div className="text-meta-sm text-text-secondary">
                    Last updated {formatDate(f.draftedAt, 'MMM d, h:mm a')}
                  </div>
                  <Link
                    href={`/funding/${f.id}`}
                    className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand-bright hover:text-brand"
                  >
                    View opportunity <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Card>
        <CardHeader>
          <CardSubtitle>Where do these programs come from?</CardSubtitle>
          <CardTitle>About the catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-meta text-text-secondary">
            VitalFlow ships with seven hand-coded Caribbean funding programs (DBJ, CDB, IDB
            Invest). Each program's rules — sector, jurisdiction, revenue cap, collateral — are
            codified against the real public program page. Future work would add a Tavily-backed
            live-research layer for current intake windows.{' '}
            <Link
              href="https://github.com/hasbunallah01/VitalFlow/blob/main/lib/funding/programs.ts"
              className="inline-flex items-center gap-0.5 text-brand-bright hover:text-brand"
            >
              See the catalog <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
