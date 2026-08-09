import { describe, expect, it } from 'vitest';
import { computeCashflowPillar, cashflowAnomalies } from './cashflow';
import type { MonthlyAggregate, ExpenseCategory } from '../../types/analysis';
import { fromMajor } from './money';

const XCD = 'XCD';
const m = (n: number) => fromMajor(n.toFixed(2), XCD);

function emptyCats(): Record<ExpenseCategory, ReturnType<typeof m>> {
  return {
    rent: m(0),
    salaries: m(0),
    utilities: m(0),
    suppliers: m(0),
    fuel: m(0),
    subscriptions: m(0),
    loan_payment: m(0),
    fees: m(0),
    other: m(0),
  };
}

function monthlyOf(netFlows: number[]): MonthlyAggregate[] {
  return netFlows.map((nf, i) => ({
    yearMonth: `2025-${String(i + 1).padStart(2, '0')}`,
    monthStart: `2025-${String(i + 1).padStart(2, '0')}-01` as `${string}-${string}-${string}`,
    inflow: m(Math.max(nf, 0) + 5000),
    outflow: m(-(Math.max(-nf, 0) + 3000)),
    netFlow: m(nf),
    balanceEnd: m(10000 + netFlows.slice(0, i + 1).reduce((s, n) => s + n, 0)),
    outflowByCategory: emptyCats(),
    inflowByCounterparty: {},
    overdraftDays: 0,
  }));
}

describe('computeCashflowPillar', () => {
  it('returns 0 points for empty input', () => {
    const p = computeCashflowPillar([]);
    expect(p.points).toBe(0);
    expect(p.confidence).toBe(0);
    expect(p.metrics).toEqual([]);
  });

  it('scores a perfectly stable, positive business high', () => {
    const nets = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    const p = computeCashflowPillar(monthlyOf(nets));
    // positivity = 1.0 → 8
    // CV ≈ 0 → 7
    // consec neg = 0 → 5
    // drawdown = 0 → 5
    // Total ≈ 25
    expect(p.points).toBeGreaterThanOrEqual(24);
    expect(p.points).toBeLessThanOrEqual(25);
    expect(p.confidence).toBe(1.0);
  });

  it('scores a struggling business low', () => {
    // 2 positive, 10 negative; high CV; long negative streaks; big drawdown.
    // Start with a positive net flow so drawdown is well-defined.
    const nets = [
      3000, -1000, -1500, -2000, -1500, -1000, -500, -2000, -1500, -2000, -1500, -1000,
    ];
    const p = computeCashflowPillar(monthlyOf(nets));
    expect(p.points).toBeLessThan(13);
  });

  it('reports 4 metrics in declared order', () => {
    const nets = [100, 200, 300, 400, 500, 600];
    const p = computeCashflowPillar(monthlyOf(nets));
    expect(p.metrics.map(m => m.id)).toEqual([
      'cashflow.positivity',
      'cashflow.cv',
      'cashflow.consecutive_negative',
      'cashflow.max_drawdown',
    ]);
  });

  it('confidence drops for short histories', () => {
    const p1 = computeCashflowPillar(monthlyOf([100, 200]));
    const p6 = computeCashflowPillar(monthlyOf([100, 200, 300, 400, 500, 600]));
    expect(p1.confidence).toBeLessThan(p6.confidence);
    expect(p6.confidence).toBe(1.0);
  });

  it('contributions sum to points', () => {
    const nets = [500, -200, 800, 300, -100, 600, 400, 700, 200, 500, 300, 100];
    const p = computeCashflowPillar(monthlyOf(nets));
    const sum = p.metrics.reduce((s, m) => s + m.contribution, 0);
    expect(sum).toBeCloseTo(p.points, 1);
  });

  it('max consecutive negative is detected', () => {
    // 3-month negative streak in the middle
    const nets = [100, 100, -100, -100, -100, 100, 100, 100];
    const p = computeCashflowPillar(monthlyOf(nets));
    const m = p.metrics.find(m => m.id === 'cashflow.consecutive_negative')!;
    expect(m.value).toBe(3);
  });

  it('sample-statement.csv numbers are reflected', () => {
    // 11/12 positive, CV ≈ 0.79, 1 consec neg, 11% drawdown
    const nets = [
      2475.51, 7881.68, 3078.35, -1475.75, 1109.68, 6499.8,
      8032.98, 4808.56, 4993.02, 4895.73, 398.74, 2447.52,
    ];
    const p = computeCashflowPillar(monthlyOf(nets));
    expect(p.points).toBeGreaterThan(15); // healthy business
    expect(p.points).toBeLessThan(25);
    const pos = p.metrics.find(m => m.id === 'cashflow.positivity')!;
    expect(pos.value).toBeCloseTo(0.9167, 2);
    const cv = p.metrics.find(m => m.id === 'cashflow.cv')!;
    expect(cv.value).toBeGreaterThan(0.7);
    expect(cv.value).toBeLessThan(0.9);
  });
});

describe('cashflowAnomalies', () => {
  it('returns empty for short series', () => {
    expect(cashflowAnomalies(monthlyOf([100, 200]))).toEqual([]);
  });

  it('flags structural break on huge single-month outflow', () => {
    const nets = [100, 200, 300, 400, -5000, 100, 200, 300, 400, 500, 600, 700];
    const a = cashflowAnomalies(monthlyOf(nets));
    expect(a.length).toBeGreaterThan(0);
    expect(a.some(x => x.kind === 'structural_break')).toBe(true);
  });
});
