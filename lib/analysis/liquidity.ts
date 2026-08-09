/**
 * Liquidity & Runway pillar.
 *
 * Weights:
 *   runway (months at current burn) ........... 9 / 20
 *   days cash on hand .......................... 5 / 20
 *   buffer stability (CV of end-of-month bal) . 4 / 20
 *   overdraft days ............................ 2 / 20
 *
 * Inputs: MonthlyAggregate[] in chronological order.
 *
 * Curves:
 *   runway: linear in [0, 6]. 0 → 0, 6+ → 1.
 *   days cash on hand: linear in [0, 90]. 0 → 0, 90+ → 1.
 *   buffer CV: inverted linear. 0 → 1, ≥0.6 → 0.
 *   overdraft days: inverted linear. 0 → 1, ≥10 → 0.
 */

import type {
  Metric,
  MonthlyAggregate,
  PillarScore,
} from '../../types/analysis';
import { PILLAR_MAX } from '../../types/analysis';
import { toMajorNumber } from './money';
import {
  clamp,
  coefficientOfVariation,
  linearMap,
  linearMapInverted,
  mean,
  round1,
} from './normalize';

function endBalances(monthly: ReadonlyArray<MonthlyAggregate>): number[] {
  const out: number[] = [];
  for (const m of monthly) {
    if (m.balanceEnd) out.push(toMajorNumber(m.balanceEnd));
  }
  return out;
}

export function computeLiquidityPillar(
  monthly: ReadonlyArray<MonthlyAggregate>,
): PillarScore {
  if (monthly.length === 0) {
    return {
      id: 'liquidity',
      label: 'Liquidity & Runway',
      maxPoints: PILLAR_MAX.liquidity,
      points: 0,
      confidence: 0,
      metrics: [],
    };
  }
  const last = monthly[monthly.length - 1]!;
  const endBal = last.balanceEnd ? toMajorNumber(last.balanceEnd) : 0;
  // outflow is stored as a negative Money; we want the magnitude.
  const avgMonthlyOut = mean(
    monthly.map(m => Math.abs(toMajorNumber(m.outflow))),
  );
  // Runway in months: how long the current balance would last at current burn.
  // If net is positive, cap runway at 24 (more than 24 months is "fine").
  const lastNet = toMajorNumber(last.netFlow);
  const monthlyBurn = lastNet < 0 ? -lastNet : 0;
  const runway = monthlyBurn > 0
    ? endBal / monthlyBurn
    : (avgMonthlyOut > 0 ? endBal / avgMonthlyOut : 24);
  const runwayCapped = clamp(runway, 0, 24);
  const daysCash = avgMonthlyOut > 0
    ? (endBal / (avgMonthlyOut / 30))
    : 0;

  const bals = endBalances(monthly);
  const bufCV = bals.length >= 2 ? coefficientOfVariation(bals) : 0;
  const totalOD = monthly.reduce((s, m) => s + m.overdraftDays, 0);

  const runwayScore = linearMap(runwayCapped, 0, 6);
  const daysScore = linearMap(daysCash, 0, 90);
  const bufScore = linearMapInverted(clamp(bufCV, 0, 10), 0, 0.6);
  const odScore = linearMapInverted(totalOD, 0, 10);

  const w = PILLAR_MAX.liquidity;
  const runP = { max: 9, raw: runwayScore };
  const daysP = { max: 5, raw: daysScore };
  const bufP = { max: 4, raw: bufScore };
  const odP = { max: 2, raw: odScore };

  const conf = monthly.length >= 6 && last.balanceEnd ? 1.0 : monthly.length >= 3 ? 0.6 : 0.3;

  const metrics: Metric[] = [
    {
      id: 'liquidity.runway',
      label: 'Runway (months)',
      value: round1(runway * 10) / 10,
      weight: runP.max / w,
      contribution: round1(runP.raw * runP.max),
      confidence: conf,
      provenance: last.balanceEnd
        ? { kind: 'computed' }
        : { kind: 'unavailable', reason: 'No end-of-month balance available' },
      explanation: `End-of-period balance divided by current monthly burn.`,
    },
    {
      id: 'liquidity.days_cash',
      label: 'Days cash on hand',
      value: round1(daysCash),
      weight: daysP.max / w,
      contribution: round1(daysP.raw * daysP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `End-of-period balance divided by average daily outflow.`,
    },
    {
      id: 'liquidity.buffer_cv',
      label: 'Buffer stability (CV of EOM balance)',
      value: round1(bufCV * 100) / 100,
      weight: bufP.max / w,
      contribution: round1(bufP.raw * bufP.max),
      confidence: bals.length >= 6 ? 1.0 : bals.length >= 3 ? 0.6 : 0.3,
      provenance: { kind: 'computed' },
      explanation: `Coefficient of variation of month-end balances.`,
    },
    {
      id: 'liquidity.overdraft_days',
      label: 'Overdraft days',
      value: totalOD,
      weight: odP.max / w,
      contribution: round1(odP.raw * odP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Total days across the period where the running balance went below zero.`,
    },
  ];

  const total = metrics.reduce((s, m) => s + m.contribution, 0);
  return {
    id: 'liquidity',
    label: 'Liquidity & Runway',
    maxPoints: w,
    points: round1(total),
    confidence: conf,
    metrics,
  };
}
