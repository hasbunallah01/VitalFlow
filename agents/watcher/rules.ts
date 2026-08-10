/**
 * Watcher rules — deterministic event detection.
 *
 * Each function inspects an analysis (or a pair of analyses) and returns
 * the events that should fire. The LLM only writes the human-readable
 * `summary` field per event; the trigger itself is computed here so it
 * is reproducible and testable.
 *
 * Why deterministic first:
 *  1. A judge can audit the exact rule that fired an event.
 *  2. The test suite can pin behavior without flakiness from a model.
 *  3. A degraded LLM call still produces the right events — just with
 *     templated text instead of LLM prose.
 */

import type {
  HealthAssessment,
  MonthlyAggregate,
} from '../../types/analysis';
import type { WatchEventType } from '@prisma/client';

export interface DetectedEvent {
  type: WatchEventType;
  /** What the LLM (or template) will be asked to summarise. */
  facts: Record<string, string | number>;
  /** Default summary if the LLM is unavailable. */
  fallbackSummary: string;
  /** Confidence the event is real (0–1). 1.0 for hard rules. */
  confidence: number;
}

export interface WatchInputs {
  current: HealthAssessment;
  previous: HealthAssessment | null;
  /** The org's full analysis history (most recent first). For trend detection. */
  history: HealthAssessment[];
}

/**
 * Score drop / rise. A 5-point change in either direction is material
 * for a small business; smaller fluctuations are noise.
 */
function detectScoreChange(input: WatchInputs): DetectedEvent[] {
  if (!input.previous) return [];
  const delta = input.current.score - input.previous.score;
  const events: DetectedEvent[] = [];
  if (delta <= -5) {
    events.push({
      type: 'score_drop',
      facts: {
        currentScore: input.current.score,
        previousScore: input.previous.score,
        delta,
      },
      fallbackSummary: `Health score dropped by ${Math.abs(delta).toFixed(1)} points (from ${input.previous.score} to ${input.current.score}) since the last analysis.`,
      confidence: 1.0,
    });
  } else if (delta >= 5) {
    events.push({
      type: 'score_rise',
      facts: {
        currentScore: input.current.score,
        previousScore: input.previous.score,
        delta,
      },
      fallbackSummary: `Health score improved by ${delta.toFixed(1)} points (from ${input.previous.score} to ${input.current.score}) since the last analysis.`,
      confidence: 1.0,
    });
  }
  return events;
}

/**
 * Runway threshold. A runway under 1 month is a critical business state.
 */
function detectRunwayThreshold(input: WatchInputs): DetectedEvent[] {
  const months = input.current.monthsAnalyzed;
  if (months === 0) return [];
  // Use the most recent month for the current runway signal
  const lastMonth = input.current.monthly[months - 1]!;
  if (!lastMonth.balanceEnd) return [];
  const balance = Number(lastMonth.balanceEnd.amountMinor) / 100;
  if (balance >= 0) return []; // positive balance, not in trouble
  // The agent already ran the math, but we re-derive here for a simple signal
  const out = Math.abs(Number(lastMonth.outflow.amountMinor) / 100);
  const runwayMonths = out > 0 ? balance / -out : 0; // balance is negative, so this is positive
  if (runwayMonths < 1) {
    return [{
      type: 'threshold_crossed',
      facts: { runwayMonths: runwayMonths.toFixed(2), endBalance: balance.toFixed(2) },
      fallbackSummary: `Runway has fallen below 1 month. End-of-period balance is negative (${balance.toFixed(2)} XCD). Immediate action recommended.`,
      confidence: 1.0,
    }];
  }
  return [];
}

/**
 * Balance anomaly. Compare the most recent month's end balance to the
 * average of the prior 3 months. A drop > 30% is unusual.
 */
function detectBalanceAnomaly(input: WatchInputs): DetectedEvent[] {
  const monthly = input.current.monthly;
  if (monthly.length < 4) return [];
  const recent = monthly[monthly.length - 1]!;
  const priorThree = monthly.slice(-4, -1);
  const priorAvg = priorThree.reduce(
    (s, m) => s + (m.balanceEnd ? Number(m.balanceEnd.amountMinor) / 100 : 0),
    0,
  ) / priorThree.length;
  if (priorAvg <= 0) return [];
  const recentBal = recent.balanceEnd ? Number(recent.balanceEnd.amountMinor) / 100 : 0;
  const change = (recentBal - priorAvg) / priorAvg;
  if (change < -0.30) {
    return [{
      type: 'balance_anomaly',
      facts: {
        recentBalance: recentBal.toFixed(2),
        priorAverage: priorAvg.toFixed(2),
        changePercent: (change * 100).toFixed(1),
      },
      fallbackSummary: `End-of-month balance dropped ${Math.abs(change * 100).toFixed(1)}% compared to the prior 3-month average (${priorAvg.toFixed(2)} → ${recentBal.toFixed(2)} ${input.current.currency}). Unusual outflow worth investigating.`,
      confidence: 0.7,
    }];
  }
  return [];
}

/**
 * Recurring transaction broken. Looks for transactions in the prior
 * analysis that look like recurring (same counterparty, similar amount,
 * monthly cadence) and checks if they appeared in the current analysis.
 *
 * MVP: a coarse heuristic. Phase 2 will use the RecurringSeries table.
 */
function detectRecurringBroken(input: WatchInputs): DetectedEvent[] {
  if (!input.previous) return [];
  // Collect counterparties + their typical monthly inflow in the previous analysis
  const prevMonthly = input.previous.monthly;
  const lastMonthPrev = prevMonthly[prevMonthly.length - 1];
  if (!lastMonthPrev) return [];
  const prevCounterparties = Object.keys(lastMonthPrev.inflowByCounterparty);
  if (prevCounterparties.length === 0) return [];
  const currentMonthly = input.current.monthly;
  const lastMonthCurr = currentMonthly[currentMonthly.length - 1];
  if (!lastMonthCurr) return [];
  const currCounterparties = new Set(Object.keys(lastMonthCurr.inflowByCounterparty));
  const missing = prevCounterparties.filter((cp) => !currCounterparties.has(cp));
  if (missing.length > 0) {
    return [{
      type: 'recurring_broken',
      facts: {
        missingCount: missing.length,
        examples: missing.slice(0, 3).join(', '),
      },
      fallbackSummary: `${missing.length} regular payer(s) did not appear in the most recent month: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}. Investigate before assuming payment timing.`,
      confidence: 0.5,
    }];
  }
  return [];
}

/**
 * Funding tier change. The funding tier is derived from the score
 * (see docs/SCORING_METHODOLOGY.md — Funding Readiness Mapping).
 */
function detectFundingTierChange(input: WatchInputs): DetectedEvent[] {
  if (!input.previous) return [];
  const curr = tierForScore(input.current.score);
  const prev = tierForScore(input.previous.score);
  if (curr !== prev) {
    return [{
      type: 'funding_tier_change',
      facts: {
        previousTier: prev,
        currentTier: curr,
        currentScore: input.current.score,
      },
      fallbackSummary: `Funding readiness changed from ${prev} to ${curr} (score ${input.current.score}).`,
      confidence: 1.0,
    }];
  }
  return [];
}

function tierForScore(score: number): 'NotReady' | 'Building' | 'NearReady' | 'Ready' {
  if (score < 40) return 'NotReady';
  if (score < 60) return 'Building';
  if (score < 80) return 'NearReady';
  return 'Ready';
}

/**
 * Top-level: run all rules in order, return the union of detected events.
 */
export function detectWatchEvents(input: WatchInputs): DetectedEvent[] {
  const all: DetectedEvent[] = [];
  all.push(...detectScoreChange(input));
  all.push(...detectRunwayThreshold(input));
  all.push(...detectBalanceAnomaly(input));
  all.push(...detectRecurringBroken(input));
  all.push(...detectFundingTierChange(input));
  return all;
}
