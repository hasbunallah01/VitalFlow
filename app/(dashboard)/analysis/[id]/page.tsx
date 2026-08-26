import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreGauge } from '@/components/dashboard/score-gauge';
import { PillarCard } from '@/components/dashboard/pillar-card';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart';
import { getAnalysis, getAudit } from '@/lib/api/client';
import { bandColor, formatDate, formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let overview;
  try {
    overview = await getAnalysis(id);
  } catch {
    notFound();
  }
  const audit = await getAudit('all', 20).catch(
    (): import('@/lib/api/types').AuditResponse => ({}),
  );
  const recs = (audit.recommendations ?? []).filter((r) => r.analysisId === id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-meta-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to overview
        </Link>
      </div>
      <PageHeader
        title="Analysis"
        subtitle={overview.filename}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="neutral">
              {formatDate(overview.periodStart, 'MMM yyyy')} – {formatDate(overview.periodEnd, 'MMM yyyy')}
            </Badge>
            <Badge tone="neutral">{overview.monthsAnalyzed} months</Badge>
            <Badge tone="neutral">{overview.currency}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardSubtitle>Overall</CardSubtitle>
            <CardTitle>{overview.band}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreGauge score={overview.score} band={overview.band} size={200} />
            <div className="mt-4 grid w-full grid-cols-2 gap-2 border-t border-border pt-4 text-meta-sm">
              <Stat label="Months" value={formatNumber(overview.monthsAnalyzed)} />
              <Stat label="Confidence" value={`${Math.round((overview.confidence ?? 0) * 100)}%`} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
          {overview.pillars.map((p) => (
            <PillarCard key={p.id} pillar={p} />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardSubtitle>Trend</CardSubtitle>
          <CardTitle>Monthly inflow vs outflow</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={overview.monthly} currency={overview.currency} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardSubtitle>Anomalies</CardSubtitle>
            <CardTitle>What the engine flagged</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview.anomalies.details ?? []).length === 0 ? (
              <p className="text-meta text-text-secondary">No anomalies detected.</p>
            ) : (
              (overview.anomalies.details ?? []).map((a, i) => (
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
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-meta-sm">
              <Stat label="Returned" value={formatNumber(overview.anomalies.returnedPayments)} />
              <Stat label="Overdraft days" value={formatNumber(overview.anomalies.overdraftDays)} />
              <Stat label="Breaks" value={formatNumber(overview.anomalies.structuralBreaks)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardSubtitle>Pillar breakdown</CardSubtitle>
            <CardTitle>What drove the score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.pillars.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-canvas px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-meta-sm font-semibold text-text-primary">{p.label}</span>
                  <span className="tabular-nums text-meta-sm text-text-secondary">
                    {Math.round(p.points)} / {p.maxPoints}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {p.metrics.slice(0, 4).map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-meta-sm">
                      <span className="text-text-secondary">{m.label}</span>
                      <span className="tabular-nums text-text-primary">{m.value.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardSubtitle>Recommendations</CardSubtitle>
            <CardTitle>What the Insight agent said</CardTitle>
          </div>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-meta-sm font-medium text-brand-bright hover:text-brand"
          >
            All insights <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recs.length === 0 ? (
            <p className="text-meta text-text-secondary">No recommendations for this analysis.</p>
          ) : (
            recs.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-canvas px-3.5 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-meta-sm font-semibold text-text-primary">{r.action}</span>
                  <Badge tone="brand">P{r.priority}</Badge>
                </div>
                <p className="mt-1 text-meta-sm text-text-secondary">{r.rationale}</p>
              </div>
            ))
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
      <div className="mt-0.5 text-body-sm font-semibold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}
