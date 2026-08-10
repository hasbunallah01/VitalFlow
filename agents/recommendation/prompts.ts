/**
 * Prompt templates for the Insight Generation agent.
 *
 * One function per template. Output is the user-side prompt; the
 * system prompt lives in the agent itself.
 *
 * Rules:
 *  - Plain language for a non-finance Caribbean small business owner.
 *  - Cite only numbers present in the input. Never invent.
 *  - One or two sentences. Under 320 characters.
 */

import type { HealthAssessment } from '../../types/analysis';
import type { RawRecommendation } from './rules';

export function renderRecommendationPrompt(
  rec: RawRecommendation,
  analysis: HealthAssessment,
): string {
  const facts = JSON.stringify(rec.facts);
  return `Caribbean small business (currency ${analysis.currency}, health score ${analysis.score}/100, band "${analysis.band}"). Recommended action: "${rec.action}". Facts: ${facts}. Write a one- or two-sentence rationale (under 320 chars) that explains why this matters and what to do, in plain language the owner can act on. Reply as JSON: {"rationale": "..."}`;
}
