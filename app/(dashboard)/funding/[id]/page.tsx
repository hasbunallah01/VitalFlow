import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, ListChecks, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFundingOutreach } from '@/lib/api/client';
import { OutreachActions } from '@/components/funding/outreach-actions';
import { eligibilityColor, formatDate, outreachStatusColor, timeAgo } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function FundingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let outreach;
  try {
    outreach = await getFundingOutreach(id);
  } catch {
    notFound();
  }

  const statusColors = outreachStatusColor(outreach.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/funding"
          className="inline-flex items-center gap-1 text-meta-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All funding
        </Link>
      </div>
      <PageHeader
        title={outreach.planHeadline ?? 'Funding outreach'}
        subtitle={outreach.planSummary ?? undefined}
        action={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta-sm font-medium capitalize ${statusColors.text} ${statusColors.bg}`}
          >
            {outreach.status}
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardSubtitle>Approver state machine</CardSubtitle>
          <CardTitle>Owner actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-meta text-text-secondary">
            VitalFlow never sends anything to a lender on your behalf. You approve the
            outreach, then create a share link, then copy it. The lender view reads the
            evidence pack at <code className="font-mono text-meta-sm">/lender/[token]</code>.
          </p>
          <OutreachActions outreach={outreach} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Plan</CardSubtitle>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent>
            {outreach.plan?.nextSteps?.length ? (
              <ol className="space-y-2.5">
                {outreach.plan.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-meta">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-meta-sm font-semibold text-brand">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-meta text-text-secondary">No plan steps available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Provenance</CardSubtitle>
            <CardTitle>How this was generated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-meta">
            <Row label="Model" value={outreach.draftedByModel ?? 'rule-based'} mono />
            <Row label="Drafted" value={timeAgo(outreach.draftedAt)} />
            <Row label="Analysis" value={outreach.analysisId} mono />
            <Row label="Views" value={`${outreach.viewCount} lender opens`} />
            {outreach.shareLink ? (
              <Row
                label="Share link"
                value={`expires ${formatDate(outreach.shareLink.expiresAt, 'MMM d, yyyy')}`}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardSubtitle>Programs evaluated</CardSubtitle>
          <CardTitle>{outreach.eligiblePrograms.length} Caribbean programs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {outreach.eligiblePrograms.map((p) => {
              const gap = outreach.readinessGap?.find((g) => g.programId === p.programId);
              const c = gap ? eligibilityColor(gap.status) : eligibilityColor(p.eligible ? 'eligible' : 'blocked');
              return (
                <li key={p.programId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-text-secondary" />
                      <span className="font-semibold text-text-primary">{p.programName}</span>
                    </div>
                    <div className="mt-0.5 text-meta-sm text-text-secondary">{p.institution}</div>
                    {p.ruleMissed.length > 0 ? (
                      <ul className="mt-1.5 space-y-1">
                        {p.ruleMissed.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-meta-sm text-text-secondary">
                            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-band-watch" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {gap ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-meta-sm font-medium ${c.text} ${c.bg}`}>
                        {gap.status}
                      </span>
                    ) : p.eligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-positive-muted px-2.5 py-0.5 text-meta-sm font-medium text-positive">
                        <CheckCircle2 className="h-3.5 w-3.5" /> eligible
                      </span>
                    ) : (
                      <span className="rounded-full bg-canvas px-2.5 py-0.5 text-meta-sm font-medium text-text-secondary">
                        not eligible
                      </span>
                    )}
                    {gap?.totalPointsShort ? (
                      <span className="text-meta-sm tabular-nums text-text-secondary">
                        short {gap.totalPointsShort.toFixed(0)}pt
                      </span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardSubtitle>Evidence pack (preview)</CardSubtitle>
          <CardTitle>What a lender would see</CardTitle>
        </CardHeader>
        <CardContent>
          <details className="rounded-lg border border-border bg-canvas p-3">
            <summary className="cursor-pointer text-meta-sm font-medium text-text-secondary">
              View raw JSON
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-card p-3 font-mono text-meta-sm text-text-primary">
              {JSON.stringify(outreach.evidencePack, null, 2)}
            </pre>
          </details>
          <p className="mt-3 text-meta-sm text-text-secondary">
            The full lender-facing view (PDF + structured profile) is rendered at
            <code className="mx-1 rounded bg-canvas px-1.5 py-0.5 font-mono text-meta-sm">/lender/[token]</code>
            when a token is issued.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className={mono ? 'font-mono text-meta-sm text-text-primary' : 'font-medium text-text-primary'}>
        {value}
      </span>
    </div>
  );
}
