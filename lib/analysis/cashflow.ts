/**
 * Cash Flow Stability pillar.
 *
 * The first pillar. Weights:
 *   positivity .......................... 8 / 25
 *   CV of net flow ...................... 7 / 25
 *   max consecutive negative months ..... 5 / 25
 *   max drawdown ........................ 5 / 25
 *
 * Inputs: MonthlyAggregate[] in chronological order.
 * Output: PillarScore with `points` in [0, 25] (rounded to 1 decimal).
 *
 * Curves (see docs/SCORING_METHODOLOGY.md):
 *   positivity: linear. 0 → 0, 1.0 → 1.0
 *   CV net flow: inverted linear. 0 → 1.0, ≥1.5 → 0
 *   consec neg: inverted linear. 0 → 1.0, ≥6 → 0
 *   drawdown: inverted linear. 0 → 1.0, ≥1.0 → 0
 *
 * The numbers on the curves are derived from the worked example in
 * SCORING_METHODOLOGY.md. They produce a fair score for healthy,
 * struggling, and critical businesses.
 */

import type {
  AnomalyDetail,
  Metric,
  MonthlyAggregate,
  PillarScore,
} from '../../types/analysis';
import { PILLAR_MAX } from '../../types/analysis';
import type { Money } from '../../types/money';
import { toMajorNumber } from './money';
import {
  clamp,
  coefficientOfVariation,
  linearMap,
  linearMapInverted,
  longestRun,
  maxDrawdown,
  round1,
} from './normalize';

/** Convert a list of Money netFlow to plain numbers. Currency-mismatch errors. */
function netFlowSeries(
  monthly: ReadonlyArray<MonthlyAggregate>,
): number[] {
  const out: number[] = [];
  for (const m of monthly) {
    if (m.netFlow.currency !== monthly[0]!.netFlow.currency) {
      throw new Error(
        `Currency mismatch in cashflow monthly: ${m.netFlow.currency} vs ${monthly[0]!.netFlow.currency}`,
      );
    }
    out.push(toMajorNumber(m.netFlow));
  }
  return out;
}

/** Confidence for the cashflow pillar: 1.0 if we have ≥6 months, lower otherwise. */
function confidence(months: number): number {
  if (months >= 6) return 1.0;
  if (months >= 3) return 0.7;
  if (months >= 1) return 0.4;
  return 0.0;
}

export function computeCashflowPillar(
  monthly: ReadonlyArray<MonthlyAggregate>,
): PillarScore {
  if (monthly.length === 0) {
    return {
      id: 'cashflow',
      label: 'Cash Flow Stability',
      maxPoints: PILLAR_MAX.cashflow,
      points: 0,
      confidence: 0,
      metrics: [],
    };
  }
  const nets = netFlowSeries(monthly);
  const positiveMonths = nets.filter(n => n > 0).length;
  const positivity = positiveMonths / nets.length;
  const cv = clamp(coefficientOfVariation(nets), 0, 10); // cap wild CVs
  const maxConsecNeg = longestRun(nets, n => n <= 0);
  const maxDD = maxDrawdown(nets);

  // Raw scores in [0, 1]
  const positivityScore = linearMap(positivity, 0, 1);
  const cvScore = linearMapInverted(cv, 0, 1.5);
  const consecScore = linearMapInverted(maxConsecNeg, 0, 6);
  const ddScore = linearMapInverted(maxDD, 0, 1);

  // Weighted contributions (sum of weights = PILLAR_MAX.cashflow = 25)
  const w = PILLAR_MAX.cashflow;
  const pos = { max: 8, raw: positivityScore };
  const cvP = { max: 7, raw: cvScore };
  const cons = { max: 5, raw: consecScore };
  const dd = { max: 5, raw: ddScore };

  const metrics: Metric[] = [
    {
      id: 'cashflow.positivity',
      label: 'Positive months',
      value: round1(positivity * 100) / 100, // ratio in [0, 1]
      weight: pos.max / w,
      contribution: round1(pos.raw * pos.max),
      confidence: confidence(monthly.length),
      provenance: { kind: 'computed' },
      explanation: `${positiveMonths} of ${nets.length} months had positive net flow.`,
    },
    {
      id: 'cashflow.cv',
      label: 'CV of net flow',
      value: round1(cv * 100) / 100,
      weight: cvP.max / w,
      contribution: round1(cvP.raw * cvP.max),
      confidence: confidence(monthly.length),
      provenance: { kind: 'computed' },
      explanation: `Coefficient of variation of monthly net flow (lower = more stable).`,
    },
    {
      id: 'cashflow.consecutive_negative',
      label: 'Max consecutive negative months',
      value: maxConsecNeg,
      weight: cons.max / w,
      contribution: round1(cons.raw * cons.max),
      confidence: confidence(monthly.length),
      provenance: { kind: 'computed' },
      explanation: `Longest run of months with net flow ≤ 0.`,
    },
    {
      id: 'cashflow.max_drawdown',
      label: 'Max drawdown',
      value: round1(maxDD * 100) / 100,
      weight: dd.max / w,
      contribution: round1(dd.raw * dd.max),
      confidence: confidence(monthly.length),
      provenance: { kind: 'computed' },
      explanation: `Largest peak-to-trough decline in cumulative cash, as a fraction of the running peak.`,
    },
  ];

  const total = metrics.reduce((s, m) => s + m.contribution, 0);
  return {
    id: 'cashflow',
    label: 'Cash Flow Stability',
    maxPoints: w,
    points: round1(total),
    confidence: confidence(monthly.length),
    metrics,
  };
}

/**
 * Side-output: any structural cashflow anomalies the other pillars should
 * also know about. Currently this just emits large unexplained outflows
 * and structural breaks. Other pillars call this if they need it.
 */
export function cashflowAnomalies(
  monthly: ReadonlyArray<MonthlyAggregate>,
): AnomalyDetail[] {
  const nets = netFlowSeries(monthly);
  const out: AnomalyDetail[] = [];
  if (nets.length < 3) return out;
  const meanAbs = nets.reduce((s, n) => s + Math.abs(n), 0) / nets.length;
  // Single-month outflow > 3× mean abs net → likely a structural break
  for (let i = 0; i < nets.length; i++) {
    if (nets[i]! < 0 && Math.abs(nets[i]!) > 3 * meanAbs) {
      out.push({
        kind: 'structural_break',
        date: monthly[i]!.monthStart,
        description: `Net outflow of ${nets[i]!.toFixed(2)} in ${monthly[i]!.yearMonth} is > 3× the mean absolute net flow.`,
        confidence: 0.6,
        amount: monthly[i]!.netFlow,
      });
    }
  }
  return out;
}

/** Helper to keep imports tidy elsewhere. */
export type { Money };
