import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Sparkles, ExternalLink, FileText, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getFundingOutreach } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';
import { ApproverBar } from './approver-bar';

export const dynamic = 'force-dynamic';

function statusTone(status: string): 'brand' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'approved': return 'brand';
    case 'shared': return 'brand';
    case 'viewed': return 'warning';
    case 'completed': return 'success';
    case 'revoked':
    case 'failed': return 'danger';
    default: return 'neutral';
  }
}

function statusLabel(status: string): string {
  if (!status) return 'Draft';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function FundingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab =
    tab === 'programs' || tab === 'evidence' || tab === 'share' ? tab : 'plan';
  let data;
  try {
    data = await getFundingOutreach(id);
  } catch {
    notFound();
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/funding"
            className="inline-flex items-center gap-1 text-label-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to funding
          </Link>
          <h1 className="mt-2 text-h1 font-bold tracking-tight text-text-primary">
            {data.plan.headline || 'Funding outreach'}
          </h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Drafted {formatDate(data.draftedAt, 'MMM d, yyyy')}
            {data.draftedByModel ? (
              <>
                {' · '}
                <span className="font-mono text-label-sm">{data.draftedByModel}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
          {data.approvedAt ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Approver state machine bar */}
      <ApproverBar outreach={data} />

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="plan" href={`/funding/${id}`}>Plan</TabsTrigger>
          <TabsTrigger value="programs" href={`/funding/${id}?tab=programs`}>Programs</TabsTrigger>
          <TabsTrigger value="evidence" href={`/funding/${id}?tab=evidence`}>Evidence pack</TabsTrigger>
          <TabsTrigger value="share" href={`/funding/${id}?tab=share`}>Share</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>AI-prepared plan</CardSubtitle>
              <CardTitle>{data.plan.headline}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-text-secondary">{data.plan.summary}</p>
              {data.plan.recommendedProgram ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-soft border border-border bg-canvas/50 px-3 py-2 text-label-sm text-text-primary">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  Recommended:{' '}
                  <span className="font-semibold">{data.plan.recommendedProgram}</span>
                </div>
              ) : null}
              {data.plan.nextSteps.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-h4 font-semibold text-text-primary">Next steps</h3>
                  <ol className="mt-3 space-y-2">
                    {data.plan.nextSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-body-sm text-text-secondary">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-label-sm font-semibold text-brand">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="mt-6">
          <div className="space-y-3">
            {data.eligiblePrograms.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-label text-text-secondary">No program data available.</p>
                </CardContent>
              </Card>
            ) : (
              data.eligiblePrograms.map((p) => (
                <Card key={p.programId}>
                  <CardContent>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-h5 font-semibold text-text-primary">
                            {p.programName}
                          </div>
                          {p.eligible ? (
                            <Badge tone="success">Eligible</Badge>
                          ) : (
                            <Badge tone="warning">Not eligible</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-label-sm text-text-secondary">
                          {p.institution}
                        </div>
                        {p.ruleMissed.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-label-sm text-text-secondary">
                            {p.ruleMissed.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Lender evidence</CardSubtitle>
              <CardTitle>Evidence pack</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-soft bg-canvas/60 p-4 text-label-sm text-text-primary">
                {JSON.stringify(data.evidencePack, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Read-only</CardSubtitle>
              <CardTitle>Shareable lender link</CardTitle>
            </CardHeader>
            <CardContent>
              {data.shareLink ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-soft border border-border bg-canvas/50 px-3 py-2 font-mono text-label-sm text-text-primary">
                    <LinkIcon className="h-3.5 w-3.5 text-brand" />
                    <code className="truncate">/l/{data.shareLink.token}</code>
                  </div>
                  <div className="grid gap-3 text-label-sm sm:grid-cols-3">
                    <Stat label="Expires" value={formatDate(data.shareLink.expiresAt, 'MMM d, yyyy')} />
                    <Stat label="Accesses" value={String(data.shareLink.accessCount)} />
                    <Stat
                      label="Status"
                      value={data.shareLink.revokedAt ? 'Revoked' : 'Active'}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-label text-text-secondary">
                  No share link generated. Approve and share from the action bar above.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-soft border border-border bg-card p-3">
      <div className="text-micro uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-body-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
