/**
 * Score — composes the five pillar compute modules into a HealthAssessment.
 *
 * The pipeline:
 *   monthly[] → cashflow pillar
 *   monthly[] → revenue pillar
 *   monthly[] → expenses pillar
 *   monthly[] → liquidity pillar
 *   monthly[] + risk inputs → anomalies → risk pillar
 *
 * Then we sum pillar `points` (each rounded to 1 decimal) and assign a
 * band per BANDS in types/analysis.ts.
 *
 * No LLM involvement. This is the deterministic core.
 */

import { computeCashflowPillar, cashflowAnomalies } from './cashflow';
import { computeRevenuePillar } from './revenue';
import { computeExpensesPillar } from './expenses';
import { computeLiquidityPillar } from './liquidity';
import { computeRiskPillar, detectAnomalies } from './anomalies';
import type {
  BandId,
  HealthAssessment,
  PillarId,
  PillarScore,
} from '../../types/analysis';
import { BANDS, PILLAR_IDS } from '../../types/analysis';
import type { CurrencyCode, ISODate } from '../../types/money';
import { toMajorNumber } from './money';
import { round1 } from './normalize';

export interface ScoreInput {
  organizationId: string;
  statementId: string;
  currency: CurrencyCode;
  periodStart: ISODate;
  periodEnd: ISODate;
  /** Monthly aggregates in chronological order. */
  monthly: ReadonlyArray<import('../../types/analysis').MonthlyAggregate>;
  /** Count of NSF / returned item fees in the period. From Transaction classification. */
  returnedPayments: number;
  /** Sum of loan_payment category across the period. */
  loanPaymentTotal: number;
}

export interface ScoreOutput {
  assessment: HealthAssessment;
  /** Wall-clock per module, for the compute trace. */
  timings: Record<string, number>;
}

function pickBand(score: number): BandId {
  for (const b of BANDS) {
    if (score >= b.min && score <= b.max) return b.id;
  }
  // Out-of-range safety: if score < 0 return critical, if > 100 strong.
  if (score < 0) return 'critical';
  return 'strong';
}

export function computeScore(input: ScoreInput): ScoreOutput {
  const start = Date.now();
  const t: Record<string, number> = {};

  const t0 = Date.now();
  const cashflow = computeCashflowPillar(input.monthly);
  t.cashflow = Date.now() - t0;

  const t1 = Date.now();
  const revenue = computeRevenuePillar(input.monthly);
  t.revenue = Date.now() - t1;

  const t2 = Date.now();
  const expenses = computeExpensesPillar(input.monthly);
  t.expenses = Date.now() - t2;

  const t3 = Date.now();
  const liquidity = computeLiquidityPillar(input.monthly);
  t.liquidity = Date.now() - t3;

  const t4 = Date.now();
  const totalInflow = input.monthly.reduce(
    (s, m) => s + toMajorNumber(m.inflow),
    0,
  );
  const totalOverdraftDays = input.monthly.reduce(
    (s, m) => s + m.overdraftDays,
    0,
  );
  const anomalies = detectAnomalies({
    monthly: input.monthly,
    returnedPayments: input.returnedPayments,
    overdraftDays: totalOverdraftDays,
    loanPaymentTotal: input.loanPaymentTotal,
    totalInflow,
  });
  // Inject structural break info from cashflow module
  const cfAnoms = cashflowAnomalies(input.monthly);
  // Currently cashflowAnomalies output is folded into the detectAnomalies
  // above; we leave this hook for future expansion.
  void cfAnoms;
  const risk = computeRiskPillar(input.monthly, {
    returnedPayments: input.returnedPayments,
    overdraftDays: totalOverdraftDays,
    loanPaymentTotal: input.loanPaymentTotal,
    totalInflow,
  }, anomalies);
  t.risk = Date.now() - t4;

  const pillars: PillarScore[] = PILLAR_IDS.map(id => {
    switch (id) {
      case 'cashflow': return cashflow;
      case 'revenue': return revenue;
      case 'expenses': return expenses;
      case 'liquidity': return liquidity;
      case 'risk': return risk;
    }
  });

  const score = round1(pillars.reduce((s, p) => s + p.points, 0));
  const band = pickBand(score);
  const confidence = Math.min(...pillars.map(p => p.confidence));

  const assessment: HealthAssessment = {
    id: `analysis_${input.statementId}_${Date.now()}`,
    organizationId: input.organizationId,
    statementId: input.statementId,
    currency: input.currency,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    monthsAnalyzed: input.monthly.length,
    pillars,
    score,
    band,
    anomalies,
    monthly: input.monthly,
    confidence,
    computeTrace: [
      { module: 'cashflow', version: '1.0.0', durationMs: t.cashflow ?? 0 },
      { module: 'revenue', version: '1.0.0', durationMs: t.revenue ?? 0 },
      { module: 'expenses', version: '1.0.0', durationMs: t.expenses ?? 0 },
      { module: 'liquidity', version: '1.0.0', durationMs: t.liquidity ?? 0 },
      { module: 'risk', version: '1.0.0', durationMs: t.risk ?? 0 },
    ],
  };

  t.total = Date.now() - start;
  return { assessment, timings: t };
}

export type { HealthAssessment, PillarScore, PillarId, BandId };
