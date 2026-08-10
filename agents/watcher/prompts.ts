/**
 * Prompt templates for the Watcher agent.
 *
 * One function per template. The output of each is a complete user
 * prompt — system prompts live in the agent itself.
 *
 * Style guide for all prompts:
 *  - Plain language a non-finance Caribbean small business owner
 *    would understand.
 *  - No jargon without explanation.
 *  - No invented numbers — only the facts in the input.
 *  - One sentence. Under 280 characters.
 */

import type { HealthAssessment } from '../../types/analysis';
import type { DetectedEvent } from './rules';

export function renderWatchPrompt(
  event: DetectedEvent,
  input: { current: HealthAssessment; previous: HealthAssessment | null },
): string {
  const facts = JSON.stringify(event.facts);
  const currency = input.current.currency;
  switch (event.type) {
    case 'score_drop':
      return `A Caribbean small business's health score fell from ${input.previous?.score ?? 'unknown'} to ${input.current.score} (out of 100, currency ${currency}). The drop is ${event.facts.delta} points. Facts: ${facts}. Write a one-sentence summary (under 280 chars) that tells the business owner what happened in plain language. Reply as JSON: {"summary": "..."}`;
    case 'score_rise':
      return `A Caribbean small business's health score improved from ${input.previous?.score ?? 'unknown'} to ${input.current.score} (out of 100, currency ${currency}). The rise is ${event.facts.delta} points. Facts: ${facts}. Write a one-sentence summary (under 280 chars) that tells the business owner what happened in plain language. Reply as JSON: {"summary": "..."}`;
    case 'threshold_crossed':
      return `A Caribbean small business has crossed a critical financial threshold. Facts: ${facts}. Currency: ${currency}. Write a one-sentence summary (under 280 chars) explaining the situation to the business owner. Reply as JSON: {"summary": "..."}`;
    case 'balance_anomaly':
      return `A Caribbean small business's bank balance behaved unusually compared to its recent history. Facts: ${facts}. Currency: ${currency}. Write a one-sentence summary (under 280 chars) that flags the change. Reply as JSON: {"summary": "..."}`;
    case 'recurring_broken':
      return `A Caribbean small business is missing expected recurring payments. Facts: ${facts}. Currency: ${currency}. Write a one-sentence summary (under 280 chars) that the owner can act on. Reply as JSON: {"summary": "..."}`;
    case 'funding_tier_change':
      return `A Caribbean small business's funding readiness tier changed. Facts: ${facts}. Write a one-sentence summary (under 280 chars) explaining what this means for their ability to get funding. Reply as JSON: {"summary": "..."}`;
    case 'risk_flag_new':
      return `A Caribbean small business has a new risk flag. Facts: ${facts}. Write a one-sentence summary (under 280 chars) that names the risk. Reply as JSON: {"summary": "..."}`;
    default:
      return `A material change was detected for a Caribbean small business. Facts: ${facts}. Currency: ${currency}. Write a one-sentence summary (under 280 chars). Reply as JSON: {"summary": "..."}`;
  }
}
