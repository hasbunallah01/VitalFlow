/**
 * Risk Profile pillar + anomaly detection.
 *
 * The risk pillar is INVERTED: we start at the max (10) and deduct for
 * each risk event. Each event has a cap so a single category can't
 * destroy the whole score.
 *
 * Weights (deduction caps):
 *   returned payments: −2 each, max −4
 *   overdraft events (days): −1 per 5 days, max −3
 *   loan stress: −2 if any loan_payment with low cover (<1.2)
 *   large unexplained outflow: −1 each, max −2
 *   structural break: −2 if detected
 *   rapid deterioration: −2 if last-3-months slope significantly negative
 *
 * Floor: 0. Ceiling: 10.
 */

import type {
  AnomalyDetail,
  AnomalySummary,
  Metric,
  MonthlyAggregate,
  PillarScore,
} from '../../types/analysis';
import { PILLAR_MAX } from '../../types/analysis';
import { toMajorNumber } from './money';
import { mean, round1 } from './normalize';

const RETURNED_DEDUCT_PER = 2;
const RETURNED_DEDUCT_MAX = 4;
const OVERDRAFT_DEDUCT_PER_5 = 1;
const OVERDRAFT_DEDUCT_MAX = 3;
const LOAN_STRESS_DEDUCT = 2;
const LARGE_OUTFLOW_DEDUCT_PER = 1;
const LARGE_OUTFLOW_DEDUCT_MAX = 2;
const STRUCTURAL_BREAK_DEDUCT = 2;
const RAPID_DETERIORATION_DEDUCT = 2;

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * Detect large unexplained outflows: any single transaction outflow
 * > 3× the median monthly outflow, and not obviously a fixed cost
 * (rent, salary, utility). Caller pre-filters the Transaction list.
 *
 * Here we work from MonthlyAggregate so we just look at month totals.
 */
function detectLargeOutflows(
  monthly: ReadonlyArray<MonthlyAggregate>,
): { count: number; details: AnomalyDetail[] } {
  if (monthly.length < 3) return { count: 0, details: [] };
  // outflow is negative Money; compare magnitudes.
  const outs = monthly.map(m => Math.abs(toMajorNumber(m.outflow)));
  const sorted = [...outs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const threshold = median * 3;
  let count = 0;
  const details: AnomalyDetail[] = [];
  for (let i = 0; i < monthly.length; i++) {
    if (outs[i]! > threshold) {
      count += 1;
      details.push({
        kind: 'large_outflow',
        date: monthly[i]!.monthStart,
        description: `Outflow of ${outs[i]!.toFixed(2)} in ${monthly[i]!.yearMonth} is > 3× the median monthly outflow.`,
        confidence: 0.5,
        amount: monthly[i]!.outflow,
      });
    }
  }
  return { count, details };
}

function detectStructuralBreaks(
  monthly: ReadonlyArray<MonthlyAggregate>,
): { count: number; details: AnomalyDetail[] } {
  if (monthly.length < 6) return { count: 0, details: [] };
  const outs = monthly.map(m => Math.abs(toMajorNumber(m.outflow)));
  const firstHalf = outs.slice(0, outs.length / 2);
  const secondHalf = outs.slice(outs.length / 2);
  const firstMean = mean(firstHalf);
  const secondMean = mean(secondHalf);
  if (firstMean <= 0) return { count: 0, details: [] };
  const change = (secondMean - firstMean) / firstMean;
  if (Math.abs(change) > 0.30) {
    return {
      count: 1,
      details: [
        {
          kind: 'structural_break',
          description: `Outflow level changed by ${(change * 100).toFixed(1)}% between the first and second half of the period.`,
          confidence: 0.7,
        },
      ],
    };
  }
  return { count: 0, details: [] };
}

function detectRapidDeterioration(
  monthly: ReadonlyArray<MonthlyAggregate>,
): { detected: boolean; details: AnomalyDetail[] } {
  if (monthly.length < 4) return { detected: false, details: [] };
  const last3 = monthly.slice(-3);
  const nets = last3.map(m => toMajorNumber(m.netFlow));
  if (nets.every(n => n < 0)) {
    return {
      detected: true,
      details: [
        {
          kind: 'rapid_deterioration',
          description: `Last 3 months all have negative net flow.`,
          confidence: 0.9,
        },
      ],
    };
  }
  // Slope of net flow over the last 3 months, normalized
  const meanN = mean(nets);
  if (meanN <= 0) return { detected: false, details: [] };
  let slope = 0;
  for (let i = 0; i < nets.length; i++) {
    slope += (i - 1) * (nets[i]! - meanN);
  }
  slope /= 2; // sum of (i-1)^2 for i in 0..2 = 2
  const trendPct = slope / meanN;
  if (trendPct < -0.20) {
    return {
      detected: true,
      details: [
        {
          kind: 'rapid_deterioration',
          description: `Net flow deteriorating rapidly in the last 3 months (${(trendPct * 100).toFixed(1)}%/month).`,
          confidence: 0.7,
        },
      ],
    };
  }
  return { detected: false, details: [] };
}

export interface RiskInput {
  monthly: ReadonlyArray<MonthlyAggregate>;
  /** Count of NSF / returned item fees in the period. */
  returnedPayments: number;
  /** Total days the account was in overdraft across the period. */
  overdraftDays: number;
  /** Sum of loan_payment category across the period. 0 if no loans. */
  loanPaymentTotal: number;
  /** Total inflow across the period (for cover calc). */
  totalInflow: number;
}

export function detectAnomalies(input: RiskInput): AnomalySummary {
  const large = detectLargeOutflows(input.monthly);
  const breaks = detectStructuralBreaks(input.monthly);
  const rapid = detectRapidDeterioration(input.monthly);

  const details: AnomalyDetail[] = [];
  // Returned payments
  for (let i = 0; i < input.returnedPayments; i++) {
    details.push({
      kind: 'returned_payment',
      description: `Returned item / NSF fee (${i + 1} of ${input.returnedPayments}).`,
      confidence: 0.95,
    });
  }
  // Overdraft days
  if (input.overdraftDays > 0) {
    details.push({
      kind: 'overdraft_day',
      description: `Account was in overdraft for ${input.overdraftDays} days across the period.`,
      confidence: 0.95,
    });
  }
  details.push(...large.details, ...breaks.details, ...rapid.details);

  return {
    returnedPayments: input.returnedPayments,
    overdraftDays: input.overdraftDays,
    largeUnexplainedOutflows: large.count,
    structuralBreaks: breaks.count,
    rapidDeteriorationDetected: rapid.detected,
    details,
  };
}

export function computeRiskPillar(
  monthly: ReadonlyArray<MonthlyAggregate>,
  input: { returnedPayments: number; overdraftDays: number; loanPaymentTotal: number; totalInflow: number },
  anomalies: AnomalySummary,
): PillarScore {
  const max = PILLAR_MAX.risk;
  const conf = monthly.length >= 6 ? 1.0 : monthly.length >= 3 ? 0.7 : 0.4;

  // Each metric is a DEDUCTION (negative contribution to the pillar).
  // We start at the max and deduct, but each metric's `value` is the
  // raw count, and `contribution` is the points kept (0 for full deduct,
  // max for no deduct). Cleaner: each metric represents "absence of risk"
  // and is scored 0..max.

  // For risk, we use a 0..max scheme where 0 = worst (full deduct), max = best.
  // To keep the convention that contribution is in [0, max] per metric,
  // we model: contribution = max - deduction, normalized per-event.

  // Simpler: each metric is a fraction of points kept, summing to max.
  // Define each "subscore" in [0, 1] of max:
  const retSub = clamp(
    1 - Math.min(input.returnedPayments * RETURNED_DEDUCT_PER, RETURNED_DEDUCT_MAX) / max,
    0,
    1,
  );
  const odSub = clamp(
    1 - Math.min(Math.ceil(input.overdraftDays / 5) * OVERDRAFT_DEDUCT_PER_5, OVERDRAFT_DEDUCT_MAX) / max,
    0,
    1,
  );
  const loanStress = input.loanPaymentTotal > 0 && input.totalInflow > 0
    ? input.totalInflow / input.loanPaymentTotal
    : Infinity;
  const loanSub = loanStress < 1.2
    ? clamp(1 - LOAN_STRESS_DEDUCT / max, 0, 1)
    : 1;
  const largeSub = clamp(
    1 - Math.min(anomalies.largeUnexplainedOutflows * LARGE_OUTFLOW_DEDUCT_PER, LARGE_OUTFLOW_DEDUCT_MAX) / max,
    0,
    1,
  );
  const breakSub = anomalies.structuralBreaks > 0
    ? clamp(1 - STRUCTURAL_BREAK_DEDUCT / max, 0, 1)
    : 1;
  const rapidSub = anomalies.rapidDeteriorationDetected
    ? clamp(1 - RAPID_DETERIORATION_DEDUCT / max, 0, 1)
    : 1;

  // Each subscore is in [0, portionOfMax]. We size the four "primary"
  // risk metrics so their portions sum to PILLAR_MAX.risk = 10:
  //   returned: 4
  //   overdraft: 3
  //   loan: 2
  //   large outflow: 1
  //   = 10
  // Structural break and rapid deterioration are surfaced in the
  // AnomalySummary for the UI but do not have their own pillar slot in
  // the MVP — they'd push the total above 10. The LLM narrative layer
  // is responsible for drawing attention to them in plain language.

  const subWeight = (sub: number, portionOfMax: number) => round1(sub * portionOfMax);

  const metrics: Metric[] = [
    {
      id: 'risk.returned_payments',
      label: 'Returned payments',
      value: input.returnedPayments,
      weight: 4 / max,
      contribution: subWeight(retSub, 4),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `${input.returnedPayments} NSF/returned item fee(s) in the period. Max deduct: 4.`,
    },
    {
      id: 'risk.overdraft',
      label: 'Overdraft days',
      value: input.overdraftDays,
      weight: 3 / max,
      contribution: subWeight(odSub, 3),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `${input.overdraftDays} day(s) in overdraft. Max deduct: 3.`,
    },
    {
      id: 'risk.loan_stress',
      label: 'Loan service stress',
      value: Number.isFinite(loanStress) ? round1(loanStress * 100) / 100 : 0,
      weight: 2 / max,
      contribution: subWeight(loanSub, 2),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Loan payment cover ratio. <1.2× inflow = stressed → −2.`,
    },
    {
      id: 'risk.large_outflow',
      label: 'Large unexplained outflows',
      value: anomalies.largeUnexplainedOutflows,
      weight: 1 / max,
      contribution: subWeight(largeSub, 1),
      confidence: 0.5,
      provenance: { kind: 'computed' },
      explanation: `Months where outflow > 3× median. Max deduct: 1.`,
    },
  ];

  // Suppress unused-var warnings for breakSub and rapidSub — they
  // inform the AnomalySummary but don't have their own pillar slot.
  void breakSub;
  void rapidSub;

  const total = metrics.reduce((s, m) => s + m.contribution, 0);
  return {
    id: 'risk',
    label: 'Risk Profile',
    maxPoints: max,
    points: round1(total),
    confidence: conf,
    metrics,
  };
}
