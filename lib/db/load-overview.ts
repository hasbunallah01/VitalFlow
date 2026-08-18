/**
 * Loader: turns (statementId, organizationId) into a UI-friendly
 * OverviewData. Used by the dashboard page and the analysis page
 * so they stay in lockstep.
 *
 * The Analysis Prisma row only stores `pillars` (JSON) + `score` +
 * `band` + `confidence`. The typed HealthAssessment has more —
 * `anomalies`, `monthsAnalyzed` — but those are NOT persisted
 * columns. We re-derive them here from the Statement's transactions
 * via the pure aggregator + anomaly detector (lib/analysis/anomalies).
 *
 * This means the UI always sees what the deterministic math would
 * produce today, even if a re-score were run on the same statement.
 */

import { prisma } from './client';
import { aggregateByMonth } from '@/lib/csv/aggregate';
import { toMajorNumber } from '@/lib/analysis/money';
import { detectAnomalies } from '@/lib/analysis/anomalies';
import type { OverviewData } from '@/components/overview/view';

export async function loadOverviewByAnalysisId(
  organizationId: string,
  analysisId: string,
): Promise<OverviewData | null> {
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, organizationId, status: 'completed' },
  });
  if (!analysis) return null;
  return loadFromAnalysis(organizationId, analysis);
}

export async function loadLatestOverview(
  organizationId: string,
): Promise<OverviewData | null> {
  const analysis = await prisma.analysis.findFirst({
    where: { organizationId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  if (!analysis) return null;
  return loadFromAnalysis(organizationId, analysis);
}

async function loadFromAnalysis(
  organizationId: string,
  analysis: {
    id: string;
    statementId: string;
    score: number | null;
    band: string | null;
    pillars: unknown;
    confidence: number | null;
  },
): Promise<OverviewData | null> {
  const statement = await prisma.statement.findFirst({
    where: { id: analysis.statementId, organizationId },
    include: { transactions: { orderBy: { date: 'asc' } } },
  });
  if (!statement) return null;

  const typedStatement = {
    id: statement.id,
    organizationId: statement.organizationId,
    accountId: '',
    transactions: statement.transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().slice(0, 10),
      narrative: t.description,
      amount: { amountMinor: t.amountMinor, currency: t.currency },
      balanceAfterMinor: t.balanceMinor ?? undefined,
      sourceRowIndex: t.rowNumber,
    })),
    periodStart: statement.periodStart?.toISOString().slice(0, 10) ?? '',
    periodEnd: statement.periodEnd?.toISOString().slice(0, 10) ?? '',
    currency: statement.currency ?? 'XCD',
    columnMapping: statement.columnMapping as Record<string, string>,
    dateFormat: 'DMY_SLASH' as const,
    sourceHash: statement.checksum,
    sourceFilename: statement.filename,
  };
  const agg = aggregateByMonth(typedStatement as any);
  const totalInflow = agg.monthly.reduce((s, m) => s + toMajorNumber(m.inflow), 0);
  const detected = detectAnomalies({
    monthly: agg.monthly as any,
    returnedPayments: agg.returnedPayments,
    overdraftDays: agg.monthly.reduce((s, m) => s + m.overdraftDays, 0),
    loanPaymentTotal: agg.loanPaymentTotal,
    totalInflow,
  });

  const monthly = agg.monthly.map((m) => ({
    yearMonth: m.yearMonth,
    monthStart: m.monthStart,
    inflow: toMajorNumber(m.inflow),
    outflow: Math.abs(toMajorNumber(m.outflow)),
    netFlow: toMajorNumber(m.netFlow),
    balanceEnd: m.balanceEnd ? toMajorNumber(m.balanceEnd) : null,
    overdraftDays: m.overdraftDays,
  }));
  const monthsAnalyzed = monthly.length || monthsBetween(
    statement.periodStart?.toISOString().slice(0, 10),
    statement.periodEnd?.toISOString().slice(0, 10),
  );
  return {
    id: analysis.id,
    score: analysis.score ?? 0,
    band: analysis.band ?? 'watch',
    currency: statement.currency ?? 'XCD',
    periodStart: statement.periodStart?.toISOString().slice(0, 10) ?? null,
    periodEnd: statement.periodEnd?.toISOString().slice(0, 10) ?? null,
    monthsAnalyzed,
    confidence: analysis.confidence ?? 0,
    pillars: (analysis.pillars as OverviewData['pillars']) ?? [],
    anomalies: {
      returnedPayments: detected.returnedPayments,
      overdraftDays: detected.overdraftDays,
      largeUnexplainedOutflows: detected.largeUnexplainedOutflows,
      structuralBreaks: detected.structuralBreaks,
      rapidDeteriorationDetected: detected.rapidDeteriorationDetected,
      details: detected.details.map((d) => ({
        kind: d.kind,
        description: d.description,
        date: d.date,
        confidence: d.confidence,
      })),
    },
    monthly,
    filename: statement.filename ?? 'statement.csv',
  };
}

function monthsBetween(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}
