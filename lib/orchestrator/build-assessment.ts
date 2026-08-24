/**
 * Reconstruct a typed HealthAssessment from DB state.
 *
 * The Prisma `Analysis` row only stores `pillars` as JSON, plus
 * `score`, `band`, `confidence`. The typed `HealthAssessment` also
 * carries `anomalies`, `monthly[]`, and `computeTrace` — none of
 * which are stored as columns.
 *
 * For the agents, we need the full typed object. This module re-derives
 * it from the Statement's transactions:
 *   - `monthly[]`        ← `aggregateByMonth(statement)`
 *   - `anomalies`        ← `detectAnomalies(...)` from the same module
 *                          the score pipeline uses
 *   - `pillars`          ← from the Analysis row JSON (already computed)
 *   - everything else    ← from the Analysis row + Statement
 *
 * Pure deterministic reconstruction — no LLM, no inference. The
 * numbers match what the score pipeline originally produced because
 * both paths go through the same `lib/analysis/score.ts` math.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  HealthAssessment,
  PillarScore,
  MonthlyAggregate,
  AnomalySummary,
  BandId,
} from '../../types/analysis';
import type { Statement as TypedStatement, Transaction as TypedTransaction } from '../../types/transaction';
import { aggregateByMonth } from '../csv/aggregate';
import { detectAnomalies } from '../analysis/anomalies';

type Db = PrismaClient;

/**
 * Lowercase band string from the Prisma `HealthBand` enum.
 * The enum is `Strong` | `Healthy` | `Watch` | `Fragile` | `Critical`.
 */
function bandToLower(b: string | null | undefined): BandId {
  if (!b) return 'watch';
  const lower = b.toLowerCase();
  if (lower === 'strong' || lower === 'healthy' || lower === 'watch' ||
      lower === 'fragile' || lower === 'critical') {
    return lower as BandId;
  }
  return 'watch';
}

/**
 * Reconstruct the typed `HealthAssessment` for a completed analysis.
 * Returns null if the analysis doesn't exist or the statement is missing.
 */
export async function reconstructHealthAssessment(
  db: Db,
  analysisId: string,
  organizationId: string,
): Promise<{ assessment: HealthAssessment; monthsAnalyzed: number; filename: string } | null> {
  const analysis = await db.analysis.findFirst({
    where: { id: analysisId, organizationId, status: 'completed' },
  });
  if (!analysis) return null;
  const statement = await db.statement.findFirst({
    where: { id: analysis.statementId, organizationId },
    include: { transactions: { orderBy: { date: 'asc' } } },
  });
  if (!statement) return null;

  // Build the typed Statement the aggregator expects.
  const typedStatement: TypedStatement = {
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
    })) as ReadonlyArray<TypedTransaction>,
    periodStart: statement.periodStart?.toISOString().slice(0, 10) ?? '',
    periodEnd: statement.periodEnd?.toISOString().slice(0, 10) ?? '',
    currency: statement.currency ?? 'XCD',
    columnMapping: (statement.columnMapping as unknown as TypedStatement['columnMapping']) ?? ({} as TypedStatement['columnMapping']),
    dateFormat: 'DMY_SLASH',
    sourceHash: statement.checksum,
    sourceFilename: statement.filename ?? 'statement.csv',
  };

  // Re-aggregate. The deterministic math is identical to what the
  // score pipeline ran — same lib/csv/aggregate.ts + lib/analysis/*.ts.
  const agg = aggregateByMonth(typedStatement);
  const monthly: ReadonlyArray<MonthlyAggregate> = agg.monthly;

  // Re-derive anomalies. Same input the score pipeline fed in.
  const totalInflow = monthly.reduce(
    (s, m) => s + Number(m.inflow.amountMinor) / 100,
    0,
  );
  const totalOverdraftDays = monthly.reduce((s, m) => s + m.overdraftDays, 0);
  const anomalies: AnomalySummary = detectAnomalies({
    monthly,
    returnedPayments: agg.returnedPayments,
    overdraftDays: totalOverdraftDays,
    loanPaymentTotal: agg.loanPaymentTotal,
    totalInflow,
  });

  // Pull pillars back from the stored JSON. The score pipeline wrote
  // them with full PillarScore shape (id, label, maxPoints, points,
  // confidence, metrics[]).
  const pillars = (analysis.pillars as unknown as PillarScore[]) ?? [];

  const assessment: HealthAssessment = {
    id: analysis.id,
    organizationId,
    statementId: statement.id,
    currency: (statement.currency ?? 'XCD') as HealthAssessment['currency'],
    periodStart: typedStatement.periodStart,
    periodEnd: typedStatement.periodEnd,
    monthsAnalyzed: monthly.length,
    pillars,
    score: analysis.score ?? 0,
    band: bandToLower(analysis.band),
    anomalies,
    monthly,
    confidence: analysis.confidence ?? 0,
    computeTrace: [],
  };

  return {
    assessment,
    monthsAnalyzed: monthly.length,
    filename: typedStatement.sourceFilename,
  };
}
