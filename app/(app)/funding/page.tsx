import Link from 'next/link';
import { ChevronRight, ExternalLink, Sparkles, Wallet, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getFundingOutreaches, getLatestOverview } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';

function outreachStatusLabel(status: string): string {
  if (!status) return 'Draft';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function eligibilityTone(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'eligible') return 'success';
  if (status === 'almost' || status === 'gap_small' || status === 'gap_medium') return 'warning';
  if (status === 'blocked') return 'neutral';
  return 'danger';
}

function eligibilityLabel(status: string): string {
  if (status === 'eligible') return 'Eligible';
  if (status === 'almost') return 'Almost';
  if (status === 'gap_small') return 'Small gap';
  if (status === 'gap_medium') return 'Medium gap';
  if (status === 'gap_large') return 'Large gap';
  if (status === 'blocked') return 'Blocked';
  return status;
}

export const dynamic = 'force-dynamic';

export default async function FundingPage() {
  let outreach: import('@/lib/api/types').FundingOutreachListResponse = { fundingOutreach: [] };
  let overview: import('@/lib/api/types').OverviewData | null = null;
  try {
    [outreach, overview] = await Promise.all([
      getFundingOutreaches(),
      getLatestOverview(),
    ]);
  } catch (e) {
    console.error('[/funding] data fetch failed:', e);
  }

  const top = outreach.fundingOutreach[0];
  const hasOutreach = !!top;
  const eligible = hasOutreach ? (top.readinessGap ?? []).filter((g) => g.status === 'eligible') : [];
  const almost = hasOutreach
    ? (top.readinessGap ?? []).filter((g) => ['almost', 'gap_small', 'gap_medium'].includes(g.status))
    : [];
  const notEligible = hasOutreach
    ? (top.readinessGap ?? []).filter((g) => ['gap_large', 'blocked'].includes(g.status))
    : [];

  if (!overview || !hasOutreach) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Funding</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Discover funding programs you may be eligible for.
          </p>
        </div>
        <EmptyState
          icon={<Wallet className="h-7 w-7" />}
          title="No funding outreach yet"
          description="Upload a bank statement and run the agents to generate a funding outreach plan."
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold tracking-tight text-text-primary">Funding</h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Caribbean funding programs you may be eligible for.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {top.shareLink && !top.shareLink.revokedAt ? (
            <Badge tone="success">
              <Lock className="h-3 w-3" /> Share link active
            </Badge>
          ) : top.approvedAt ? (
            <Badge tone="brand">Approved</Badge>
          ) : (
            <Badge tone="warning">Draft</Badge>
          )}
          <Link href={`/funding/${top.id}`}>
            <Button size="md">
              <ExternalLink className="h-4 w-4" /> Open outreach
            </Button>
          </Link>
        </div>
      </div>

      {/* Top outreach summary */}
      {top.planHeadline ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-label-sm text-text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              AI-prepared outreach plan
            </div>
            <CardTitle>{top.planHeadline}</CardTitle>
          </CardHeader>
          {top.planSummary ? (
            <CardContent>
              <p className="text-body text-text-secondary">{top.planSummary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-label-sm">
                <span className="text-text-muted">Drafted:</span>
                <span className="text-text-primary">{formatDate(top.draftedAt, 'MMM d, yyyy')}</span>
                {top.draftedByModel ? (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-secondary">{top.draftedByModel}</span>
                  </>
                ) : null}
                <span className="text-text-muted">·</span>
                <span className="inline-flex items-center gap-1.5">
                  {outreachStatusLabel(top.status)}
                </span>
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Section
        title="Eligible now"
        empty="No programs currently eligible."
        items={eligible.map((g) => <ProgramRow key={g.programId} program={g} />)}
      />

      <Section
        title="Almost eligible"
        empty="No programs close to eligibility."
        items={almost.map((g) => <ProgramRow key={g.programId} program={g} />)}
      />

      <Section
        title="Not yet eligible"
        empty="No programs with large gaps."
        items={notEligible.map((g) => <ProgramRow key={g.programId} program={g} />)}
      />
    </div>
  );
}

function Section({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: React.ReactNode[];
}) {
  const has = items.length > 0;
  return (
    <section>
      <h2 className="mb-3 text-h3 font-semibold tracking-tight text-text-primary">
        {title}{' '}
        <span className="text-label font-medium text-text-muted">({items.length})</span>
      </h2>
      {has ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <p className="text-label text-text-secondary">{empty}</p>
      )}
    </section>
  );
}

function ProgramRow({
  program,
}: {
  program: import('@/lib/api/types').ReadinessGap;
}) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-h5 font-semibold text-text-primary">{program.programName}</div>
              <Badge tone={eligibilityTone(program.status)}>{eligibilityLabel(program.status)}</Badge>
            </div>
            {program.primaryGapPillar ? (
              <div className="mt-1 text-label-sm text-text-secondary">
                Main gap: <span className="font-medium text-text-primary">{program.primaryGapPillar}</span>
              </div>
            ) : null}
            {program.blockerReason ? (
              <ul className="mt-2 space-y-1 text-label-sm text-text-secondary">
                <li className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {program.blockerReason}
                </li>
              </ul>
            ) : null}
          </div>
          <div className="text-right text-label-sm text-text-secondary">
            {program.totalPointsShort > 0 ? (
              <>
                {program.totalPointsShort.toFixed(1)} pts short
                {program.estimatedMonthsToEligibility != null ? (
                  <div className="text-micro text-text-muted">
                    ~{program.estimatedMonthsToEligibility} mo to qualify
                  </div>
                ) : null}
              </>
            ) : (
              <span className="text-success">Ready to apply</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
