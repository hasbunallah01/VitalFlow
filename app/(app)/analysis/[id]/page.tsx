import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScoreRing } from '@/components/dashboard/score-ring';
import { TrendChart } from '@/components/charts/trend-chart';
import { getAnalysis } from '@/lib/api/client';
import { bandTokens, formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/utils/format';
import { RunAgentsButton } from './run-agents-button';

export const dynamic = 'force-dynamic';

export default async function AnalysisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab =
    tab === 'cash-flow' || tab === 'revenue' || tab === 'expenses' || tab === 'liquidity' || tab === 'risk'
      ? tab
      : 'overview';
  let data;
  try {
    data = await getAnalysis(id);
  } catch {
    notFound();
  }
  const tokens = bandTokens(data.band);
  const pillarsById = new Map(data.pillars.map((p) => [p.id, p]));
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-label-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to analyses
          </Link>
          <h1 className="mt-2 text-h1 font-bold tracking-tight text-text-primary">
            {data.filename}
          </h1>
          <p className="mt-1.5 text-body text-text-secondary">
            {formatDate(data.periodStart, 'MMM d, yyyy')} – {formatDate(data.periodEnd, 'MMM d, yyyy')}
            {' · '}
            {data.monthsAnalyzed} months
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="success">{tokens.label}</Badge>
          <RunAgentsButton analysisId={data.id} />
        </div>
      </div>

      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="overview" href={`/analysis/${id}`}>Overview</TabsTrigger>
          <TabsTrigger value="cash-flow" href={`/analysis/${id}?tab=cash-flow`}>Cash Flow</TabsTrigger>
          <TabsTrigger value="revenue" href={`/analysis/${id}?tab=revenue`}>Revenue</TabsTrigger>
          <TabsTrigger value="expenses" href={`/analysis/${id}?tab=expenses`}>Expenses</TabsTrigger>
          <TabsTrigger value="liquidity" href={`/analysis/${id}?tab=liquidity`}>Liquidity</TabsTrigger>
          <TabsTrigger value="risk" href={`/analysis/${id}?tab=risk`}>Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardSubtitle>Overall</CardSubtitle>
                <CardTitle>Financial Health Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ScoreRing score={data.score} band={data.band} size={180} />
                <p className="mt-3 text-center text-label text-text-secondary">
                  Your business is performing well. Keep monitoring critical areas and follow our recommendations.
                </p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardSubtitle>Cash Flow Trend</CardSubtitle>
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={data.monthly} currency={data.currency} />
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.pillars.map((p) => (
              <PillarCard key={p.id} pillar={p} />
            ))}
          </div>
          {data.anomalies?.details && data.anomalies.details.length > 0 ? (
            <Card className="mt-4">
              <CardHeader>
                <CardSubtitle>Detected</CardSubtitle>
                <CardTitle>Anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.anomalies.details.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm text-text-secondary">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <span>{a.description}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-6">
          <Card>
            <CardHeader>
              <CardSubtitle>Trend</CardSubtitle>
              <CardTitle>Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={data.monthly} currency={data.currency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <PillarDeep pillar={pillarsById.get('revenue_quality')} currency={data.currency} monthly={data.monthly} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <PillarDeep pillar={pillarsById.get('expense_discipline')} currency={data.currency} monthly={data.monthly} />
        </TabsContent>

        <TabsContent value="liquidity" className="mt-6">
          <PillarDeep pillar={pillarsById.get('liquidity_runway')} currency={data.currency} monthly={data.monthly} />
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          <PillarDeep pillar={pillarsById.get('risk_profile')} currency={data.currency} monthly={data.monthly} />
          {data.anomalies?.details && data.anomalies.details.length > 0 ? (
            <Card className="mt-4">
              <CardHeader>
                <CardSubtitle>Risk signals</CardSubtitle>
                <CardTitle>Detected anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.anomalies.details.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm text-text-secondary">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                      <span>{a.description}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: import('@/lib/api/types').Pillar }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardSubtitle>Pillar</CardSubtitle>
          <CardTitle>{pillar.label}</CardTitle>
        </div>
        <div className="text-right">
          <div className="text-num-md font-bold text-text-primary tabular-nums">
            {Math.round(pillar.points)}
          </div>
          <div className="text-label-sm text-text-muted">/ {pillar.maxPoints}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full bg-brand"
            style={{ width: `${(pillar.points / pillar.maxPoints) * 100}%` }}
          />
        </div>
        <ul className="mt-4 space-y-1.5">
          {pillar.metrics.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-label-sm">
              <span className="text-text-secondary">{m.label}</span>
              <span className="tabular-nums text-text-primary">
                {formatNumber(m.value, { decimals: 2 })} · {m.contribution.toFixed(1)} pts
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PillarDeep({
  pillar,
  currency,
  monthly,
}: {
  pillar: import('@/lib/api/types').Pillar | undefined;
  currency: string;
  monthly: import('@/lib/api/types').MonthlyPoint[];
}) {
  if (!pillar) {
    return (
      <Card>
        <CardContent>
          <p className="text-label text-text-secondary">No data for this pillar.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardSubtitle>Score</CardSubtitle>
          <CardTitle>{pillar.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="text-num-lg font-bold leading-none text-text-primary tabular-nums">
              {Math.round(pillar.points)}
            </div>
            <div className="pb-1 text-label text-text-muted">/ {pillar.maxPoints} points</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full bg-brand"
              style={{ width: `${(pillar.points / pillar.maxPoints) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardSubtitle>Trend</CardSubtitle>
          <CardTitle>Monthly breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={monthly} currency={currency} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardSubtitle>Sub-metrics</CardSubtitle>
          <CardTitle>What contributes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {pillar.metrics.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 text-label-sm">
                <span className="text-text-secondary">{m.label}</span>
                <span className="tabular-nums text-text-primary">
                  {formatNumber(m.value, { decimals: 2 })} <span className="text-text-muted">·</span>{' '}
                  <span className="text-brand">+{m.contribution.toFixed(1)} pts</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
