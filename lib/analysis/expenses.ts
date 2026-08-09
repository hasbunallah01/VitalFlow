/**
 * Expense Discipline pillar.
 *
 * Weights:
 *   leverage gap (expense growth - revenue growth, in pp) ... 8 / 20
 *   fixed cost coverage (inflow / fixed costs) ............... 5 / 20
 *   CV of monthly outflow .................................... 4 / 20
 *   discretionary share ...................................... 3 / 20
 *
 * Inputs: MonthlyAggregate[] in chronological order.
 *
 * Curves:
 *   leverage gap: linear in [-0.10, 0.10]. -10pp → 0, 0 → 0.5, +10pp → 1.
 *         (Positive gap = expenses growing faster than revenue = BAD.
 *          So we want INVERTED mapping. We model "gap" as "revenue_growth -
 *          expense_growth" instead so positive = good. Then linear, not inverted.)
 *   fixed cover: linear in [1.0, 3.0]. <1 → 0, 1 → 0, 3+ → 1.
 *   CV outflow: inverted linear. 0 → 1, ≥0.5 → 0.
 *   discretionary: linear (lower is better, so inverted). 0 → 1, ≥0.20 → 0.
 */

import type {
  ExpenseCategory,
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

const FIXED_CATEGORIES: ReadonlySet<ExpenseCategory> = new Set([
  'rent',
  'salaries',
  'utilities',
  'loan_payment',
]);
const DISCRETIONARY_CATEGORIES: ReadonlySet<ExpenseCategory> = new Set([
  'subscriptions',
]);

function outflowSeries(monthly: ReadonlyArray<MonthlyAggregate>): number[] {
  return monthly.map(m => toMajorNumber(m.outflow));
}

function categoryTotals(
  monthly: ReadonlyArray<MonthlyAggregate>,
): Record<ExpenseCategory, number> {
  const acc: Record<ExpenseCategory, number> = {
    rent: 0,
    salaries: 0,
    utilities: 0,
    suppliers: 0,
    fuel: 0,
    subscriptions: 0,
    loan_payment: 0,
    fees: 0,
    other: 0,
  };
  for (const m of monthly) {
    for (const k of Object.keys(acc) as ExpenseCategory[]) {
      const v = m.outflowByCategory[k];
      if (v) acc[k] += toMajorNumber(v);
    }
  }
  return acc;
}

function leverageGap(monthly: ReadonlyArray<MonthlyAggregate>): number {
  // Compare first half vs second half.
  if (monthly.length < 4) return 0;
  const half = Math.floor(monthly.length / 2);
  const first = monthly.slice(0, half);
  const second = monthly.slice(monthly.length - half);
  const firstIn = first.reduce((s, m) => s + toMajorNumber(m.inflow), 0);
  const lastIn = second.reduce((s, m) => s + toMajorNumber(m.inflow), 0);
  // outflow is negative; take abs to compare growth rates.
  const firstOut = Math.abs(first.reduce((s, m) => s + toMajorNumber(m.outflow), 0));
  const lastOut = Math.abs(second.reduce((s, m) => s + toMajorNumber(m.outflow), 0));
  if (firstIn <= 0 || firstOut <= 0) return 0;
  const revGrowth = (lastIn - firstIn) / firstIn;
  const expGrowth = (lastOut - firstOut) / firstOut;
  // Positive = revenue grew faster than expenses (good).
  return revGrowth - expGrowth;
}

export function computeExpensesPillar(
  monthly: ReadonlyArray<MonthlyAggregate>,
): PillarScore {
  if (monthly.length === 0) {
    return {
      id: 'expenses',
      label: 'Expense Discipline',
      maxPoints: PILLAR_MAX.expenses,
      points: 0,
      confidence: 0,
      metrics: [],
    };
  }
  const outflows = outflowSeries(monthly);
  const cv = clamp(coefficientOfVariation(outflows), 0, 10);
  // outflow is stored as negative Money; take abs for shares/ratios.
  const totalOut = Math.abs(mean(outflows) * monthly.length);
  const cats = categoryTotals(monthly);
  const fixedTotal = FIXED_CATEGORIES.size === 0
    ? 0
    : Math.abs(Array.from(FIXED_CATEGORIES).reduce((s, k) => s + cats[k], 0));
  const discTotal = DISCRETIONARY_CATEGORIES.size === 0
    ? 0
    : Math.abs(Array.from(DISCRETIONARY_CATEGORIES).reduce((s, k) => s + cats[k], 0));
  const totalIn = monthly.reduce((s, m) => s + toMajorNumber(m.inflow), 0);
  const fixedCover = fixedTotal > 0 ? totalIn / fixedTotal : 0;
  const discShare = totalOut > 0 ? discTotal / totalOut : 0;
  const gap = leverageGap(monthly);

  // Higher gap = better.
  const gapScore = linearMap(gap, -0.10, 0.10);
  const coverScore = linearMap(fixedCover, 1.0, 3.0);
  const cvScore = linearMapInverted(cv, 0, 0.5);
  const discScore = linearMapInverted(discShare, 0, 0.20);

  const w = PILLAR_MAX.expenses;
  const gapP = { max: 8, raw: gapScore };
  const coverP = { max: 5, raw: coverScore };
  const cvP = { max: 4, raw: cvScore };
  const discP = { max: 3, raw: discScore };

  const conf = monthly.length >= 6 ? 1.0 : monthly.length >= 3 ? 0.7 : 0.4;

  const metrics: Metric[] = [
    {
      id: 'expenses.leverage_gap',
      label: 'Leverage gap (revenue − expense growth)',
      value: round1(gap * 100) / 100,
      weight: gapP.max / w,
      contribution: round1(gapP.raw * gapP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Difference between H2-vs-H1 revenue growth and H2-vs-H1 expense growth. Positive = revenue grew faster.`,
    },
    {
      id: 'expenses.fixed_cover',
      label: 'Fixed cost coverage',
      value: round1(fixedCover * 100) / 100,
      weight: coverP.max / w,
      contribution: round1(coverP.raw * coverP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Total inflow divided by fixed costs (rent + salaries + utilities + loan payments).`,
    },
    {
      id: 'expenses.cv',
      label: 'CV of monthly outflow',
      value: round1(cv * 100) / 100,
      weight: cvP.max / w,
      contribution: round1(cvP.raw * cvP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Coefficient of variation of monthly outflow.`,
    },
    {
      id: 'expenses.discretionary',
      label: 'Discretionary share',
      value: round1(discShare * 100) / 100,
      weight: discP.max / w,
      contribution: round1(discP.raw * discP.max),
      confidence: conf,
      provenance: { kind: 'computed' },
      explanation: `Share of total outflow classified as discretionary (subscriptions, marketing, travel).`,
    },
  ];

  const total = metrics.reduce((s, m) => s + m.contribution, 0);
  return {
    id: 'expenses',
    label: 'Expense Discipline',
    maxPoints: w,
    points: round1(total),
    confidence: conf,
    metrics,
  };
}
