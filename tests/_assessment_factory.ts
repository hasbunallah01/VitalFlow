/**
 * Test-only helper: build a HealthAssessment with customisable knobs.
 *
 * Used by both the mocked agent tests (tests/agents.test.ts) and the
 * live integration tests (tests/agents.live.test.ts). Lives in the
 * tests/ directory so it never ships with the production code.
 */

import type {
  HealthAssessment,
  Metric,
  MonthlyAggregate,
  PillarId,
  PillarScore,
} from '../types/analysis';
import { fromMajor, zero } from '../lib/analysis/money';

const XCD = 'XCD';

function money(n: number) {
  return fromMajor(n.toFixed(2), XCD);
}

function emptyCats() {
  return {
    rent: zero(XCD),
    salaries: zero(XCD),
    utilities: zero(XCD),
    suppliers: zero(XCD),
    fuel: zero(XCD),
    subscriptions: zero(XCD),
    loan_payment: zero(XCD),
    fees: zero(XCD),
    other: zero(XCD),
  };
}

function monthlyWithInflows(nets: number[]): MonthlyAggregate[] {
  return nets.map((nf, i) => ({
    yearMonth: `2025-${String(i + 1).padStart(2, '0')}`,
    monthStart: `2025-${String(i + 1).padStart(2, '0')}-01` as `${string}-${string}-${string}`,
    inflow: money(Math.max(nf, 0) + 5000),
    outflow: money(-(Math.max(-nf, 0) + 3000)),
    netFlow: money(nf),
    balanceEnd: money(10000 + nets.slice(0, i + 1).reduce((s, n) => s + n, 0)),
    outflowByCategory: emptyCats(),
    inflowByCounterparty: {},
    overdraftDays: 0,
  })) as MonthlyAggregate[];
}

function metric(id: string, value: number, contribution: number, weight: number): Metric {
  return {
    id, label: id, value, weight, contribution, confidence: 1.0,
    provenance: { kind: 'computed' },
  };
}

function pillar(id: PillarId, label: string, maxPoints: number, points: number, metrics: Metric[]): PillarScore {
  return { id, label, maxPoints, points, confidence: 1.0, metrics };
}

export function makeAssessment(opts: {
  score: number;
  band: 'strong' | 'healthy' | 'watch' | 'fragile' | 'critical';
  hhi?: number;
  runwayMonths?: number;
  returnedPayments?: number;
  outflowCV?: number;
  fixedCover?: number;
  discretionary?: number;
  revenueTrend?: number;
  recurringShare?: number;
  netFlows?: number[];
  endingBalance?: number;
}): HealthAssessment {
  const nets = opts.netFlows ?? [2475, 7881, 3078, -1475, 1109, 6499, 8032, 4808, 4993, 4895, 398, 2447];
  const monthly = monthlyWithInflows(nets);
  if (opts.endingBalance !== undefined) {
    // Re-build the last month with the overridden balance. We avoid
    // mutating the readonly balanceEnd by constructing a new array.
    const last = monthly[monthly.length - 1]!;
    monthly[monthly.length - 1] = { ...last, balanceEnd: money(opts.endingBalance) };
  }
  const cashflowMetrics: Metric[] = [
    metric('cashflow.positivity', 0.917, 7.3, 0.32),
    metric('cashflow.cv', 0.79, 3.3, 0.28),
    metric('cashflow.consecutive_negative', 1, 4.2, 0.20),
    metric('cashflow.max_drawdown', 0.11, 4.5, 0.20),
  ];
  const revenueMetrics: Metric[] = [
    metric('revenue.trend', opts.revenueTrend ?? -0.004, 3.2, 0.28),
    metric('revenue.cv', 0.16, 5.1, 0.28),
    metric('revenue.recurring', opts.recurringShare ?? 1.0, 6.0, 0.24),
    metric('revenue.hhi', opts.hhi ?? 0.42, 2.0, 0.20),
  ];
  const expenseMetrics: Metric[] = [
    metric('expenses.leverage_gap', 0.06, 6.4, 0.40),
    metric('expenses.fixed_cover', opts.fixedCover ?? 2.36, 3.4, 0.25),
    metric('expenses.cv', opts.outflowCV ?? 0.09, 3.3, 0.20),
    metric('expenses.discretionary', opts.discretionary ?? 0.007, 2.9, 0.15),
  ];
  const liquidityMetrics: Metric[] = [
    metric('liquidity.runway', opts.runwayMonths ?? 4.5, 6.7, 0.45),
    metric('liquidity.days_cash', 135, 5.0, 0.25),
    metric('liquidity.buffer_cv', 0.34, 1.7, 0.20),
    metric('liquidity.overdraft_days', 0, 2.0, 0.10),
  ];
  const riskMetrics: Metric[] = [
    metric('risk.returned_payments', opts.returnedPayments ?? 2, 2.4, 0.40),
    metric('risk.overdraft', 0, 3.0, 0.30),
    metric('risk.loan_stress', 0, 2.0, 0.20),
    metric('risk.large_outflow', 0, 1.0, 0.10),
  ];
  return {
    id: 'a1', organizationId: 'org1', statementId: 's1', currency: XCD,
    periodStart: '2025-07-01' as `${string}-${string}-${string}`,
    periodEnd: '2026-06-29' as `${string}-${string}-${string}`,
    monthsAnalyzed: 12,
    score: opts.score, band: opts.band,
    pillars: [
      pillar('cashflow', 'Cash Flow Stability', 25, 19.3, cashflowMetrics),
      pillar('revenue', 'Revenue Quality & Predictability', 25, 16.3, revenueMetrics),
      pillar('expenses', 'Expense Discipline', 20, 16.0, expenseMetrics),
      pillar('liquidity', 'Liquidity & Runway', 20, 15.4, liquidityMetrics),
      pillar('risk', 'Risk Profile', 10, 8.4, riskMetrics),
    ],
    anomalies: {
      returnedPayments: 0, overdraftDays: 0, largeUnexplainedOutflows: 0,
      structuralBreaks: 0, rapidDeteriorationDetected: false, details: [],
    },
    monthly,
    confidence: 0.9,
    computeTrace: [],
  };
}
