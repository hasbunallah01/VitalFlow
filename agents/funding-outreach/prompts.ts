/**
 * Prompt templates for the Funding Outreach agent.
 *
 * Style guide:
 *  - Plain language a Caribbean small business owner understands.
 *  - No jargon without explanation.
 *  - No invented numbers — only the facts in the input.
 *  - Two short sentences per program headline. The plan summary
 *    is 3-4 sentences.
 */

import type { BusinessProfile, EligibilityResult, EvaluationOutcome } from './rules';

export function renderProgramHeadlinePrompt(
  result: EligibilityResult,
  profile: BusinessProfile,
): string {
  const p = result.program;
  const facts = JSON.stringify({
    program: p.name,
    institution: p.institution,
    maxAmount: `${p.maxLoanAmount.amount.toLocaleString()} ${p.maxLoanAmount.currency}`,
    interestRate: p.interestRatePercent
      ? `${p.interestRatePercent.min}–${p.interestRatePercent.max}%`
      : 'grant',
    termMonths: `${p.termMonths.min}–${p.termMonths.max} months`,
    collateral: p.collateralRequired ? 'required' : 'not required',
  });
  return `Caribbean small business in ${profile.country}, sector ${profile.sector}, health score ${result.pillarScores.cashflow + result.pillarScores.revenue + result.pillarScores.expenses + result.pillarScores.liquidity + result.pillarScores.risk}/100. Funding program: ${p.name} (${p.institution}). Terms: ${facts}. Write a one-sentence headline (under 180 chars) explaining what this program offers and why it fits the business. Reply as JSON: {"headline": "..."}`;
}

export function renderPlanSummaryPrompt(
  outcome: EvaluationOutcome,
  profile: BusinessProfile,
  topProgram: EligibilityResult,
  assessment: { score: number; band: string },
): string {
  const eligible = outcome.eligible;
  const almost = outcome.almost;
  const programList = eligible.map((r) => r.program.name).join(', ');
  const almostList = almost.slice(0, 2).map(
    (r) => `${r.program.name} (needs: ${r.ruleMissed.join('; ')})`,
  ).join('; ');
  return `Caribbean small business in ${profile.country}, sector ${profile.sector}, health score ${assessment.score}/100 (band: ${assessment.band}). Eligible funding programs: ${programList || 'none'}. Almost eligible: ${almostList || 'none'}. Top recommended program: ${topProgram.program.name}. Write a 3-4 sentence plan summary (under 600 chars) in plain language explaining what to do next: which program to pursue, why it fits, and what to prepare. Reply as JSON: {"summary": "..."}`;
}

export function renderAlmostEligibleAdvicePrompt(
  result: EligibilityResult,
  profile: BusinessProfile,
): string {
  const missed = result.ruleMissed.join('; ');
  return `A Caribbean small business in ${profile.country}, sector ${profile.sector} is "almost eligible" for ${result.program.name} (${result.program.institution}) but is missing: ${missed}. Write one short sentence (under 200 chars) telling the owner exactly what to fix to qualify. Reply as JSON: {"advice": "..."}`;
}
