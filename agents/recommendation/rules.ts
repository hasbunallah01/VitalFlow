/**
 * Recommendation rules — deterministic generation of raw actions.
 *
 * Each function inspects an analysis and returns zero or more raw
 * recommendations. The Insight Generation agent enriches the
 * `rationale` field with LLM prose; the rest of the row is
 * pre-computed so the LLM is doing language work, not judgment.
 *
 * Priority is 1 (most urgent) to 5 (nice to have). estimatedPointGain
 * is a rough, single-decimal estimate of how much the score would
 * improve if the recommendation were fully implemented.
 */

import type { HealthAssessment, Metric } from '../../types/analysis';

export interface RawRecommendation {
  /** Stable id used in the prompt and the persisted Recommendation. */
  key: string;
  /** Short verb phrase shown to the user. */
  action: string;
  /** Pillar this addresses. */
  pillar: 'cashflow' | 'revenue' | 'expenses' | 'liquidity' | 'risk';
  /** 1 (urgent) to 5 (nice to have). */
  priority: number;
  /** Implementation effort. */
  effort: 'low' | 'medium' | 'high';
  /** Estimated point gain if done well, rounded to 1 decimal. */
  estimatedPointGain: number;
  /** Concrete facts the LLM (or template) will reference. */
  facts: Record<string, string | number>;
  /** Default rationale if the LLM is unavailable. */
  fallbackRationale: string;
}

function metricById(
  assessment: HealthAssessment,
  id: string,
): Metric | undefined {
  for (const p of assessment.pillars) {
    for (const m of p.metrics) {
      if (m.id === id) return m;
    }
  }
  return undefined;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** HHI > 0.40 means > 77% of revenue from a single counterparty. */
function recCustomerConcentration(a: HealthAssessment): RawRecommendation[] {
  const hhi = metricById(a, 'revenue.hhi');
  if (!hhi) return [];
  if (hhi.value < 0.40) return [];
  const topPct = Math.round(hhi.value * 100);
  return [{
    key: 'diversify_customers',
    action: 'Diversify your customer base',
    pillar: 'revenue',
    priority: 2,
    effort: 'high',
    estimatedPointGain: round1((0.6 - hhi.value) * 25), // up to 5 if you fully diversify
    facts: { hhi: round1(hhi.value), topCustomerShare: `${topPct}%` },
    fallbackRationale: `Currently ${topPct}% of your revenue comes from your largest counterparty. Losing that customer would put the business at risk. Adding 2–3 regular new customers in the next quarter will reduce this concentration.`,
  }];
}

/** Runway under 1 month is critical. */
function recCashBuffer(a: HealthAssessment): RawRecommendation[] {
  const runway = metricById(a, 'liquidity.runway');
  if (!runway) return [];
  if (runway.value >= 1) return [];
  return [{
    key: 'build_cash_buffer',
    action: 'Build a cash buffer',
    pillar: 'liquidity',
    priority: 1,
    effort: 'medium',
    estimatedPointGain: 6.0,
    facts: { runwayMonths: round1(runway.value) },
    fallbackRationale: `At current burn, the business has under 1 month of runway. Aim for at least 3 months of operating expenses in cash before taking on new commitments.`,
  }];
}

/** Any returned payment warrants auto-pay. */
function recAutoPay(a: HealthAssessment): RawRecommendation[] {
  const returned = metricById(a, 'risk.returned_payments');
  if (!returned) return [];
  if (returned.value < 1) return [];
  return [{
    key: 'set_up_auto_pay',
    action: 'Set up auto-pay for recurring bills',
    pillar: 'risk',
    priority: 2,
    effort: 'low',
    estimatedPointGain: 2.0,
    facts: { nsfCount: returned.value },
    fallbackRationale: `${returned.value} NSF/returned item fee(s) in the last period. Auto-pay for rent, utilities, and supplier invoices eliminates this risk entirely.`,
  }];
}

/** Outflow CV > 0.5 means monthly expenses are very volatile. */
function recSmoothOutflow(a: HealthAssessment): RawRecommendation[] {
  const cv = metricById(a, 'expenses.cv');
  if (!cv) return [];
  if (cv.value < 0.30) return [];
  return [{
    key: 'smooth_monthly_outflow',
    action: 'Smooth out monthly outflows',
    pillar: 'expenses',
    priority: 3,
    effort: 'medium',
    estimatedPointGain: 2.0,
    facts: { outflowCV: round1(cv.value) },
    fallbackRationale: `Monthly expenses swing by ${Math.round(cv.value * 100)}% on average. Negotiating fixed monthly supplier contracts or scheduling large purchases evenly across months will reduce volatility.`,
  }];
}

/** Fixed cost coverage below 1.5× means a single bad month puts the business in trouble. */
function recFixedCover(a: HealthAssessment): RawRecommendation[] {
  const cover = metricById(a, 'expenses.fixed_cover');
  if (!cover) return [];
  if (cover.value >= 1.5) return [];
  return [{
    key: 'improve_fixed_cover',
    action: 'Reduce fixed costs or grow revenue',
    pillar: 'expenses',
    priority: 2,
    effort: 'high',
    estimatedPointGain: 3.0,
    facts: { fixedCover: round1(cover.value) },
    fallbackRationale: `Fixed costs are covered ${round1(cover.value)}× by inflow. The healthy target is 2× or more. Either grow monthly revenue or identify which fixed cost can be reduced (e.g. renegotiate rent, defer a hire).`,
  }];
}

/** Discretionary share over 20% is high. */
function recDiscretionary(a: HealthAssessment): RawRecommendation[] {
  const disc = metricById(a, 'expenses.discretionary');
  if (!disc) return [];
  if (disc.value < 0.10) return [];
  return [{
    key: 'review_discretionary',
    action: 'Review discretionary subscriptions',
    pillar: 'expenses',
    priority: 4,
    effort: 'low',
    estimatedPointGain: 1.0,
    facts: { discretionaryShare: `${Math.round(disc.value * 100)}%` },
    fallbackRationale: `${Math.round(disc.value * 100)}% of expenses are discretionary (subscriptions, software, travel). A 30-minute review usually surfaces 1–2 unused services that can be cancelled.`,
  }];
}

/** Revenue is trending down. */
function recRevenueDecline(a: HealthAssessment): RawRecommendation[] {
  const trend = metricById(a, 'revenue.trend');
  if (!trend) return [];
  if (trend.value > -0.02) return []; // less than 2% decline per month
  return [{
    key: 'reverse_revenue_decline',
    action: 'Reverse the revenue decline',
    pillar: 'revenue',
    priority: 1,
    effort: 'high',
    estimatedPointGain: 5.0,
    facts: { revenueTrendPerMonth: `${(trend.value * 100).toFixed(2)}%` },
    fallbackRationale: `Monthly revenue is falling at about ${Math.abs(trend.value * 100).toFixed(1)}% per month. Identify the cause (lost customers, seasonality, pricing) and address within the next 30 days.`,
  }];
}

/** Recurring share below 50% means revenue is mostly one-off. */
function recRecurringRevenue(a: HealthAssessment): RawRecommendation[] {
  const rec = metricById(a, 'revenue.recurring');
  if (!rec) return [];
  if (rec.value >= 0.50) return [];
  return [{
    key: 'build_recurring_revenue',
    action: 'Convert one-off customers to recurring',
    pillar: 'revenue',
    priority: 3,
    effort: 'medium',
    estimatedPointGain: 2.5,
    facts: { recurringShare: `${Math.round(rec.value * 100)}%` },
    fallbackRationale: `Only ${Math.round(rec.value * 100)}% of revenue comes from repeat customers. Offering a monthly subscription, retainer, or maintenance contract will smooth revenue and improve predictability.`,
  }];
}

/** Top-level: run all rules, sort by priority, cap at 5. */
export function generateRawRecommendations(
  assessment: HealthAssessment,
): RawRecommendation[] {
  const all: RawRecommendation[] = [];
  all.push(...recCashBuffer(assessment));
  all.push(...recAutoPay(assessment));
  all.push(...recCustomerConcentration(assessment));
  all.push(...recFixedCover(assessment));
  all.push(...recSmoothOutflow(assessment));
  all.push(...recDiscretionary(assessment));
  all.push(...recRevenueDecline(assessment));
  all.push(...recRecurringRevenue(assessment));
  // Sort by priority ascending (1 = most urgent), then by estimated gain desc
  all.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.estimatedPointGain - a.estimatedPointGain;
  });
  return all.slice(0, 5); // hard cap at 5
}
