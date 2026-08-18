/**
 * Funding Outreach — eligibility engine.
 *
 * Deterministic. Given a HealthAssessment + the business's profile
 * (country, sector, months in operation, annual revenue), this engine
 * returns the programs the business is eligible for, plus a list of
 * "almost eligible" programs with the missing requirements surfaced
 * for the LLM to phrase as actionable advice.
 *
 * The agent (agents/funding-outreach/index.ts) wraps this with LLM
 * enrichment of the plan narrative.
 */

import type { HealthAssessment } from '../../types/analysis';
import {
  FUNDING_PROGRAMS,
  type FundingProgram,
  type Country,
  type Sector,
} from '../../lib/funding/programs';

export interface BusinessProfile {
  country: Country;
  sector: Sector;
  monthsInOperation: number;
  /** Annual revenue in the program's currency, in MAJOR units. */
  annualRevenue: { amount: number; currency: string };
}

export interface EligibilityResult {
  program: FundingProgram;
  eligible: boolean;
  /** Specific reasons the business is NOT eligible. Empty when eligible. */
  ruleMissed: string[];
  /** The business's pillar scores, normalised to 0-100, for transparency. */
  pillarScores: {
    cashflow: number;
    revenue: number;
    expenses: number;
    liquidity: number;
    risk: number;
  };
}

export interface EvaluationOutcome {
  eligible: EligibilityResult[];
  almost: EligibilityResult[];
  /** All programs evaluated, even the non-matches, for audit. */
  evaluated: EligibilityResult[];
}

function pillarScore(assessment: HealthAssessment, id: string): number {
  const p = assessment.pillars.find((p) => p.id === id);
  if (!p) return 0;
  // Normalise to 0-100 by dividing by max points for that pillar.
  return (p.points / p.maxPoints) * 100;
}

function evaluateOne(
  program: FundingProgram,
  assessment: HealthAssessment,
  profile: BusinessProfile,
): EligibilityResult {
  const missed: string[] = [];
  // Geography
  if (!program.countries.includes(profile.country)) {
    missed.push(`Program is not available in ${profile.country}`);
  }
  // Sector
  if (!program.sectors.includes(profile.sector)) {
    missed.push(`Sector "${profile.sector}" is not funded by this program`);
  }
  // Annual revenue cap
  if (program.maxAnnualRevenue) {
    if (profile.annualRevenue.currency !== program.maxAnnualRevenue.currency) {
      // For now we just note; in production we'd convert via FX.
      missed.push(
        `Annual revenue currency ${profile.annualRevenue.currency} cannot be compared to program currency ${program.maxAnnualRevenue.currency}`,
      );
    } else if (profile.annualRevenue.amount > program.maxAnnualRevenue.amount) {
      missed.push(
        `Annual revenue ${profile.annualRevenue.amount.toLocaleString()} ${profile.annualRevenue.currency} exceeds program cap of ${program.maxAnnualRevenue.amount.toLocaleString()} ${program.maxAnnualRevenue.currency}`,
      );
    }
  }
  // Months in operation
  if (profile.monthsInOperation < program.minMonthsInOperation) {
    missed.push(
      `Business has been operating ${profile.monthsInOperation} months; program requires at least ${program.minMonthsInOperation}`,
    );
  }
  // Pillar score thresholds
  const scores = {
    cashflow: pillarScore(assessment, 'cashflow'),
    revenue: pillarScore(assessment, 'revenue'),
    expenses: pillarScore(assessment, 'expenses'),
    liquidity: pillarScore(assessment, 'liquidity'),
    risk: pillarScore(assessment, 'risk'),
  };
  if (scores.cashflow < program.minimumScores.cashflow) {
    missed.push(`Cash flow pillar score (${scores.cashflow.toFixed(0)}) is below program minimum (${program.minimumScores.cashflow})`);
  }
  if (scores.revenue < program.minimumScores.revenue) {
    missed.push(`Revenue pillar score (${scores.revenue.toFixed(0)}) is below program minimum (${program.minimumScores.revenue})`);
  }
  if (scores.expenses < program.minimumScores.expenses) {
    missed.push(`Expenses pillar score (${scores.expenses.toFixed(0)}) is below program minimum (${program.minimumScores.expenses})`);
  }
  if (scores.liquidity < program.minimumScores.liquidity) {
    missed.push(`Liquidity pillar score (${scores.liquidity.toFixed(0)}) is below program minimum (${program.minimumScores.liquidity})`);
  }
  if (scores.risk < program.minimumScores.risk) {
    missed.push(`Risk pillar score (${scores.risk.toFixed(0)}) is below program minimum (${program.minimumScores.risk})`);
  }
  return {
    program,
    eligible: missed.length === 0,
    ruleMissed: missed,
    pillarScores: scores,
  };
}

/**
 * Top-level: evaluate all programs. Return eligible + almost-eligible
 * (those that fail on at most 2 simple rules — used to surface
 * "you'd qualify if you fixed X" advice).
 */
export function evaluatePrograms(
  assessment: HealthAssessment,
  profile: BusinessProfile,
): EvaluationOutcome {
  const evaluated = FUNDING_PROGRAMS.map((p) => evaluateOne(p, assessment, profile));
  const eligible = evaluated.filter((r) => r.eligible);
  // "Almost" = 1-2 rule misses, all fixable (e.g., revenue cap, sector mismatch)
  const almost = evaluated.filter(
    (r) => !r.eligible && r.ruleMissed.length >= 1 && r.ruleMissed.length <= 2,
  );
  return { eligible, almost, evaluated };
}

/**
 * Score an eligible program by how good a fit it is. Higher is better.
 * Used to rank the recommended program in the agent's plan.
 */
export function fitScore(
  program: FundingProgram,
  assessment: HealthAssessment,
  profile: BusinessProfile,
): number {
  let s = 50;
  // Better pillar scores above threshold = bonus
  const ps = {
    cashflow: pillarScore(assessment, 'cashflow'),
    revenue: pillarScore(assessment, 'revenue'),
    expenses: pillarScore(assessment, 'expenses'),
    liquidity: pillarScore(assessment, 'liquidity'),
    risk: pillarScore(assessment, 'risk'),
  };
  s += Math.max(0, ps.cashflow - program.minimumScores.cashflow) * 0.5;
  s += Math.max(0, ps.revenue - program.minimumScores.revenue) * 0.5;
  s += Math.max(0, ps.expenses - program.minimumScores.expenses) * 0.5;
  s += Math.max(0, ps.liquidity - program.minimumScores.liquidity) * 0.5;
  s += Math.max(0, ps.risk - program.minimumScores.risk) * 0.5;
  // Bonus for collateral-free (easier to access)
  if (!program.collateralRequired) s += 10;
  // Bonus for grants (TA programs)
  if (program.interestRatePercent === null) s += 5;
  // Penalty for currency mismatch
  if (program.maxAnnualRevenue && program.maxAnnualRevenue.currency !== profile.annualRevenue.currency) {
    s -= 20;
  }
  return s;
}
