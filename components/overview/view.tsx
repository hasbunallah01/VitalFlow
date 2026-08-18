/**
 * Shared Overview rendering. Used by both /dashboard (latest) and
 * /analysis/[id] (specific).
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreCard } from './score-card';
import { PillarGrid } from './pillar-grid';
import { MonthlyTrend } from './monthly-trend';
import { Anomalies } from './anomalies';

export type OverviewData = {
  id: string;
  score: number;
  band: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  monthsAnalyzed: number;
  confidence: number;
  pillars: Array<{
    id: string;
    label: string;
    maxPoints: number;
    points: number;
    metrics: Array<{ id: string; label: string; value: number; contribution: number }>;
  }>;
  anomalies: {
    returnedPayments?: number;
    overdraftDays?: number;
    largeUnexplainedOutflows?: number;
    structuralBreaks?: number;
    rapidDeteriorationDetected?: boolean;
    details?: Array<{ kind: string; description: string; date?: string; confidence?: number }>;
  };
  monthly: Array<{
    yearMonth: string;
    monthStart: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    balanceEnd: number | null;
    overdraftDays: number;
  }>;
  filename: string;
};

export function OverviewView({
  data,
  title = 'Overview',
  subtitle,
}: {
  data: OverviewData;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-500">Latest analysis · {data.filename}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </header>

      <ScoreCard
        score={data.score}
        band={data.band}
        monthsAnalyzed={data.monthsAnalyzed}
        periodStart={data.periodStart}
        periodEnd={data.periodEnd}
        confidence={data.confidence}
        currency={data.currency}
      />

      <MonthlyTrend data={data.monthly} currency={data.currency} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-500">
            Five pillars
          </h2>
          <PillarGrid pillars={data.pillars} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-500">
            Risk signals
          </h2>
          <Anomalies
            summary={{
              returnedPayments: data.anomalies.returnedPayments ?? 0,
              overdraftDays: data.anomalies.overdraftDays ?? 0,
              largeUnexplainedOutflows: data.anomalies.largeUnexplainedOutflows ?? 0,
              structuralBreaks: data.anomalies.structuralBreaks ?? 0,
              rapidDeteriorationDetected: data.anomalies.rapidDeteriorationDetected ?? false,
            }}
            details={data.anomalies.details ?? []}
          />
        </div>
      </div>
    </div>
  );
}

export function OverviewEmptyState() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Let's look at your numbers
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Upload a bank statement to see your health score, the five
          pillars behind it, and what your numbers look like month by month.
        </p>
      </header>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-ink-900">No statement uploaded yet</p>
            <p className="mt-1 text-sm text-ink-500">
              We'll parse the CSV, compute the score, and show you what we found.
            </p>
          </div>
          <Link href="/analysis/upload">
            <Button size="lg">Upload a statement</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
