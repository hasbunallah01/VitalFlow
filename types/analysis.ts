/**
 * Analysis output types — what every health assessment looks like.
 * See docs/SCORING_METHODOLOGY.md.
 *
 * Design rule: every number on a HealthAssessment is a Metric with a
 * `value`, a `weight` (how much it counts in the parent pillar), and
 * a `contribution` (value * weight). The score module never has to
 * reach into a raw number — it sums contributions.
 *
 * This is the single most important file for reproducibility: if a judge
 * asks "why did this business score 63?", the answer is the sum of
 * `contribution` fields, each of which traces back to a compute module.
 */

import type { CurrencyCode, ISODate, Money } from './money';

/** How a metric behaves when value is missing or NaN. */
export type MetricProvenance =
  | { kind: 'computed' }
  | { kind: 'imputed'; reason: string }
  | { kind: 'unavailable'; reason: string };

/**
 * The atomic unit of a health assessment.
 *
 * - `value` is the raw metric (units depend on the metric — a ratio, a
 *   count, a Money amount). NEVER a percentage; ratios are 0..1 and
 *   percent-ness is applied at score time.
 * - `weight` is how much this metric contributes to its parent pillar,
 *   expressed as a ratio in [0, 1] of the pillar's max.
 * - `contribution` is `clamp(value, 0, 1) * weight * maxPoints` — the
 *   points this metric adds to the pillar score. Rounded to 1 decimal.
 * - `confidence` is 0..1, set by the compute module. Propagates up.
 */
export interface Metric {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly weight: number;
  readonly contribution: number;
  readonly confidence: number;
  readonly provenance: MetricProvenance;
  /**
   * Optional human-readable explanation of how value was derived.
   * Surfaces in the JSON dump and (lightly) in the UI. The LLM
   * narrative layer is allowed to elaborate, but it cannot invent a
   * new number — only explain this one.
   */
  readonly explanation?: string;
}

/** The five pillars. Order matters: appears in this order in the UI. */
export type PillarId =
  | 'cashflow'
  | 'revenue'
  | 'expenses'
  | 'liquidity'
  | 'risk';

export const PILLAR_IDS: ReadonlyArray<PillarId> = [
  'cashflow',
  'revenue',
  'expenses',
  'liquidity',
  'risk',
] as const;

/** Max points per pillar. The sum (100) is the maximum composite. */
export const PILLAR_MAX: Readonly<Record<PillarId, number>> = {
  cashflow: 25,
  revenue: 25,
  expenses: 20,
  liquidity: 20,
  risk: 10,
};

/**
 * A pillar's score. `points` is the sum of metric contributions (rounded
 * to 1 decimal). `metrics` is the list of metrics that fed into it.
 * `breakdown` mirrors `metrics` but flattened for JSON consumption.
 */
export interface PillarScore {
  readonly id: PillarId;
  readonly label: string;
  readonly maxPoints: number;
  readonly points: number;
  readonly confidence: number;
  readonly metrics: ReadonlyArray<Metric>;
}

/** Bands in display order, from best to worst. */
export const BANDS = [
  { id: 'strong', label: 'Strong', min: 85, max: 100 },
  { id: 'healthy', label: 'Healthy', min: 70, max: 84 },
  { id: 'watch', label: 'Watch', min: 55, max: 69 },
  { id: 'fragile', label: 'Fragile', min: 40, max: 54 },
  { id: 'critical', label: 'Critical', min: 0, max: 39 },
] as const;

export type BandId = (typeof BANDS)[number]['id'];

/** Anomaly summary for the UI and the LLM narrative. */
export interface AnomalySummary {
  readonly returnedPayments: number;
  readonly overdraftDays: number;
  readonly largeUnexplainedOutflows: number;
  readonly structuralBreaks: number;
  readonly rapidDeteriorationDetected: boolean;
  /** Specific anomaly entries the UI can render as a list. */
  readonly details: ReadonlyArray<AnomalyDetail>;
}

export interface AnomalyDetail {
  readonly kind:
    | 'returned_payment'
    | 'overdraft_day'
    | 'large_outflow'
    | 'structural_break'
    | 'rapid_deterioration'
    | 'outlier';
  readonly date?: ISODate;
  readonly description: string;
  /** 0..1 confidence this is a real anomaly (not a misclassification). */
  readonly confidence: number;
  /** Money impact when applicable, signed. */
  readonly amount?: Money;
}

/**
 * Monthly aggregate. Output of the analysis layer's first pass, input to
 * the pillar compute modules. Kept here (not in the CSV layer) because
 * the JSON is what gets persisted in the AnalysisRecord.
 */
export interface MonthlyAggregate {
  readonly yearMonth: string; // 'YYYY-MM'
  readonly monthStart: ISODate;
  readonly inflow: Money;
  readonly outflow: Money;
  readonly netFlow: Money;
  /** End-of-month balance, if available. */
  readonly balanceEnd?: Money;
  /** Subtotals of outflow by category, used by the expense pillar. */
  readonly outflowByCategory: Readonly<Record<ExpenseCategory, Money>>;
  /** Subtotals of inflow by counterparty, used for HHI. */
  readonly inflowByCounterparty: Readonly<Record<string, Money>>;
  /** Number of days in overdraft this month (balance < 0). */
  readonly overdraftDays: number;
}

export const EXPENSE_CATEGORIES = [
  'rent',
  'salaries',
  'utilities',
  'suppliers',
  'fuel',
  'subscriptions',
  'loan_payment',
  'fees',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * The full output of one analysis pass. Stored on the AnalysisRecord
 * (Prisma) and consumed by:
 *  - the UI dashboard (PillarScore[] + MonthlyAggregate[])
 *  - the LLM narrative layer (Metric.contribution + AnomalySummary)
 *  - the Funding Outreach agent (PillarScore + AnomalySummary)
 */
export interface HealthAssessment {
  readonly id: string;
  readonly organizationId: string;
  readonly statementId: string;
  readonly currency: CurrencyCode;
  readonly periodStart: ISODate;
  readonly periodEnd: ISODate;
  readonly monthsAnalyzed: number;
  readonly pillars: ReadonlyArray<PillarScore>;
  /** Sum of pillar `points`. Always in [0, 100] after rounding. */
  readonly score: number;
  readonly band: BandId;
  readonly anomalies: AnomalySummary;
  readonly monthly: ReadonlyArray<MonthlyAggregate>;
  /** Overall confidence in the score. min(pillar.confidence) for now. */
  readonly confidence: number;
  /** Trace of compute modules that ran, in order. For the audit log. */
  readonly computeTrace: ReadonlyArray<{
    module: string;
    version: string;
    durationMs: number;
  }>;
}
