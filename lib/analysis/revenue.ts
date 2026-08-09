/**
 * Revenue Quality & Predictability pillar.
 *
 * Weights:
 *   trend (slope as % of mean) ........... 7 / 25
 *   CV of monthly inflow ................. 7 / 25
 *   recurring share ...................... 6 / 25
 *   HHI of counterparty concentration .... 5 / 25
 *
 * Inputs: MonthlyAggregate[] in chronological order.
 *
 * Curves (see docs/SCORING_METHODOLOGY.md):
 *   trend: linear in [-0.05, +0.05] of mean per month.
 *         -5%/mo → 0, 0%/mo → 0.5, +5%/mo → 1.
 *   CV inflow: inverted linear. 0 → 1, ≥0.6 → 0.
 *         (Revenue naturally varies; 0.6 is a reasonable "disorderly" cap.)
 *   recurring share: linear. 0 → 0, 1.0 → 1.
 *   HHI: inverted linear. ≤0.15 → 1, ≥0.6 → 0.
 *         (HHI 0.15 = 6 roughly equal counterparties; 0.6 = one party ~77%.)
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
  hhi,
  linearMap,
  linearMapInverted,
  mean,
  olsSlope,
  round1,
} from './normalize';

function inflowSeries(monthly: ReadonlyArray<MonthlyAggregate>): number[] {
  const out: number[] = [];
  for (const m of monthly) {
    out.push(toMajorNumber(m.inflow));
  }
  return out;
}

function counterpartyShares(
  monthly: ReadonlyArray<MonthlyAggregate>,
): number[] {
  // Combine across all months
  const totals = new Map<string, number>();
  for (const m of monthly) {
    for (const [name, money] of Object.entries(m.inflowByCounterparty)) {
      const v = toMajorNumber(money);
      totals.set(name, (totals.get(name) ?? 0) + v);
    }
  }
  return Array.from(totals.values());
}

function recurringShare(monthly: ReadonlyArray<MonthlyAggregate>): number {
  // Count counterparties that appear in >= ceil(months/2) months.
  if (monthly.length === 0) return 0;
  const minMonths = Math.max(2, Math.ceil(monthly.length / 2));
  const cpMonths = new Map<string, Set<string>>();
  for (const m of monthly) {
    for (const name of Object.keys(m.inflowByCounterparty)) {
      let s = cpMonths.get(name);
      if (!s) {
        s = new Set();
        cpMonths.set(name, s);
      }
      s.add(m.yearMonth);
    }
  }
  let totalInflow = 0;
  for (const m of monthly) {
    totalInflow += toMajorNumber(m.inflow);
  }
  if (totalInflow <= 0) return 0;
  let recurringInflow = 0;
  for (const [name, months] of cpMonths) {
    if (months.size >= minMonths) {
      for (const m of monthly) {
        const v = m.inflowByCounterparty[name];
        if (v) recurringInflow += toMajorNumber(v);
      }
    }
  }
  return clamp(recurringInflow / totalInflow, 0, 1);
}

export function computeRevenuePillar(
  monthly: ReadonlyArray<MonthlyAggregate>,
): PillarScore {
  if (monthly.length === 0) {
    return {
      id: 'revenue',
      label: 'Revenue Quality & Predictability',
      maxPoints: PILLAR_MAX.revenue,
      points: 0,
      confidence: 0,
      metrics: [],
    };
  }
  const inflows = inflowSeries(monthly);
  const m = mean(inflows);
  const { slope } = olsSlope(inflows);
  const trendPerMonth = m > 0 ? slope / m : 0;
  const cv = clamp(coefficientOfVariation(inflows), 0, 10);
  const rec = recurringShare(monthly);
  const concentration = hhi(counterpartyShares(monthly));

  const trendScore = linearMap(trendPerMonth, -0.05, 0.05);
  const cvScore = linearMapInverted(cv, 0, 0.6);
  const recScore = linearMap(rec, 0, 1);
  const hhiScore = linearMapInverted(concentration, 0.15, 0.6);

  const w = PILLAR_MAX.revenue;
  const trend = { max: 7, raw: trendScore };
  const cvP = { max: 7, raw: cvScore };
  const recP = { max: 6, raw: recScore };
  const hhiP = { max: 5, raw: hhiScore };

  const conf = monthly.length >= 6 ? 1.0 : monthly.length >= 3 ? 0.7 : 0.4;

  const metrics: Metric[] = [
    {
      id: 'revenue.trend',
      label: 'Monthly revenue trend',
      value: round1(trendPerMonth * 100) / 100,
      weight: trend.max / w,
      contribution: round1(trend.raw * trend.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `OLS slope of monthly inflow as a fraction of mean monthly inflow.`,
    },
    {
      id: 'revenue.cv',
      label: 'CV of monthly inflow',
      value: round1(cv * 100) / 100,
      weight: cvP.max / w,
      contribution: round1(cvP.raw * cvP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Coefficient of variation of monthly inflow.`,
    },
    {
      id: 'revenue.recurring',
      label: 'Recurring share',
      value: round1(rec * 100) / 100,
      weight: recP.max / w,
      contribution: round1(recP.raw * recP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Share of inflow from counterparties that appear in at least half the months.`,
    },
    {
      id: 'revenue.hhi',
      label: 'Counterparty HHI',
      value: round1(concentration * 100) / 100,
      weight: hhiP.max / w,
      contribution: round1(hhiP.raw * hhiP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Herfindahl-Hirschman Index of counterparty concentration. 0.25 = 4 equal parties, 1 = one party.`,
    },
  ];

  const total = metrics.reduce((s, m) => s + m.contribution, 0);
  return {
    id: 'revenue',
    label: 'Revenue Quality & Predictability',
    maxPoints: w,
    points: round1(total),
    confidence: conf,
    metrics,
  };
}
