/**
 * Funding Outreach Agent.
 *
 * The headline agent. Given a HealthAssessment + business profile, it:
 *  1. Evaluates eligibility against all hardcoded Caribbean programs
 *  2. Picks the best-fit eligible program (or the closest "almost" match)
 *  3. Asks the LLM to write a one-paragraph plan summary
 *  4. Asks the LLM to write a one-sentence headline for each eligible program
 *  5. Returns a structured FundingOutreachDraft ready for the API layer
 *     to persist and present to the business owner for approval
 *
 * Per AGENTS.md rule 4: every execution writes an AgentRun record. The
 * caller (API route) is responsible for persisting that.
 *
 * Degradation: if the LLM is unavailable, every text field falls back
 * to a templated version. The structured data (eligibility, fit scores)
 * is always computed deterministically.
 */

import type { Agent, AgentContext, AgentResult } from '../../types/agent';
import type { HealthAssessment } from '../../types/analysis';
import type { LLMClient } from '../../lib/llm/client';
import type { FundingProgram } from '../../lib/funding/programs';
import {
  evaluatePrograms,
  fitScore,
  type BusinessProfile,
  type EligibilityResult,
  type EvaluationOutcome,
} from './rules';
import {
  renderPlanSummaryPrompt,
  renderProgramHeadlinePrompt,
  renderAlmostEligibleAdvicePrompt,
} from './prompts';

export interface FundingOutreachInput {
  assessment: HealthAssessment;
  profile: BusinessProfile;
}

export interface ProgramSummary {
  programId: string;
  programName: string;
  institution: string;
  maxAmount: { amount: number; currency: string };
  interestRatePercent: { min: number; max: number } | null;
  termMonths: { min: number; max: number };
  collateralRequired: boolean;
  /** 0-100, higher = better fit. */
  fitScore: number;
  /** LLM-polished headline (one sentence). */
  headline: string;
  /** The deterministic reason this program is on the list (eligible or almost). */
  ruleMissed: string[];
}

export interface FundingOutreachDraft {
  eligible: ProgramSummary[];
  almost: Array<ProgramSummary & { advice: string }>;
  recommendedProgramId: string | null;
  /** LLM-polished 3-4 sentence plan summary, or fallback. */
  planSummary: string;
  /** Raw outcome for the audit trail. */
  outcome: EvaluationOutcome;
  tokensIn: number;
  tokensOut: number;
  llmUsed: boolean;
}

export const FUNDING_AGENT = 'funding-outreach';
export const FUNDING_VERSION = '1.0.0';

export class FundingOutreachAgent implements Agent<FundingOutreachInput, FundingOutreachDraft> {
  readonly name = FUNDING_AGENT;
  readonly version = FUNDING_VERSION;
  readonly usesLLM = true;

  constructor(private readonly llm: LLMClient) {}

  async run(
    input: FundingOutreachInput,
    ctx: AgentContext,
  ): Promise<AgentResult<FundingOutreachDraft>> {
    const start = Date.now();
    const warnings: import('../../types/agent').AgentWarning[] = [];
    const errors: import('../../types/agent').AgentError[] = [];
    let llmUsed = false;
    let tokensIn = 0;
    let tokensOut = 0;

    // 1. Deterministic eligibility
    const outcome = evaluatePrograms(input.assessment, input.profile);

    // 2. Rank eligible programs by fit score
    const eligibleRanked: Array<EligibilityResult & { fitScore: number }> =
      outcome.eligible
        .map((r) => ({ ...r, fitScore: fitScore(r.program, input.assessment, input.profile) }))
        .sort((a, b) => b.fitScore - a.fitScore);

    const recommended = eligibleRanked[0] ?? null;

    // 3. LLM enrich: program headlines (one LLM call per eligible program)
    const eligibleSummaries: ProgramSummary[] = [];
    for (const r of eligibleRanked) {
      const headline = await this.headlineOrFallback(r, input.profile, ctx, warnings);
      if (headline.used) {
        llmUsed = true;
        tokensIn += headline.tokensIn;
        tokensOut += headline.tokensOut;
      }
      eligibleSummaries.push({
        programId: r.program.id,
        programName: r.program.name,
        institution: r.program.institution,
        maxAmount: r.program.maxLoanAmount,
        interestRatePercent: r.program.interestRatePercent,
        termMonths: r.program.termMonths,
        collateralRequired: r.program.collateralRequired,
        fitScore: r.fitScore,
        headline: headline.text,
        ruleMissed: r.ruleMissed,
      });
    }

    // 4. LLM enrich: advice for almost-eligible (up to 2, to keep the call count low)
    const almostSummaries: Array<ProgramSummary & { advice: string }> = [];
    for (const r of outcome.almost.slice(0, 2)) {
      const advice = await this.adviceOrFallback(r, input.profile, ctx, warnings);
      if (advice.used) {
        llmUsed = true;
        tokensIn += advice.tokensIn;
        tokensOut += advice.tokensOut;
      }
      almostSummaries.push({
        programId: r.program.id,
        programName: r.program.name,
        institution: r.program.institution,
        maxAmount: r.program.maxLoanAmount,
        interestRatePercent: r.program.interestRatePercent,
        termMonths: r.program.termMonths,
        collateralRequired: r.program.collateralRequired,
        fitScore: fitScore(r.program, input.assessment, input.profile),
        headline: fallbackHeadline(r.program),
        ruleMissed: r.ruleMissed,
        advice: advice.text,
      });
    }

    // 5. Plan summary (single LLM call)
    let planSummary: string;
    if (recommended) {
      const r = await this.planSummaryOrFallback(outcome, input.profile, recommended, input.assessment, ctx, warnings);
      if (r.used) {
        llmUsed = true;
        tokensIn += r.tokensIn;
        tokensOut += r.tokensOut;
      }
      planSummary = r.text;
    } else {
      planSummary = fallbackPlanSummary(outcome, input.profile);
    }

    return {
      ok: errors.length === 0,
      data: {
        eligible: eligibleSummaries,
        almost: almostSummaries,
        recommendedProgramId: recommended?.program.id ?? null,
        planSummary,
        outcome,
        tokensIn,
        tokensOut,
        llmUsed,
      },
      warnings,
      errors,
      confidence: eligibleSummaries.length > 0 ? 0.9 : 0.5,
      meta: {
        agent: this.name,
        agentVersion: this.version,
        promptId: 'funding-outreach@v1',
        model: llmUsed ? this.llm.defaultModel : undefined,
        tokensIn,
        tokensOut,
        durationMs: Date.now() - start,
      },
    };
  }

  // ----- LLM helpers (each with a fallback) --------------------------------

  private async headlineOrFallback(
    r: EligibilityResult,
    profile: BusinessProfile,
    ctx: AgentContext,
    warnings: import('../../types/agent').AgentWarning[],
  ): Promise<{ text: string; used: boolean; tokensIn: number; tokensOut: number }> {
    const fallback = fallbackHeadline(r.program);
    if (!this.llm) return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    try {
      const res = await this.llm.chat(
        [
          { role: 'system', content: 'You are a Caribbean funding advisor. Reply with JSON only: {"headline": "..."}' },
          { role: 'user', content: renderProgramHeadlinePrompt(r, profile) },
        ],
        { jsonMode: true, maxTokens: 80, temperature: 0.3, timeoutMs: ctx.budget.maxDurationMs },
      );
      const parsed = safeJson(res.content);
      if (parsed && typeof parsed === 'object' && 'headline' in parsed) {
        const h = (parsed as { headline: unknown }).headline;
        if (typeof h === 'string' && h.length > 0 && h.length < 220) {
          return { text: h, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
        }
      }
      warnings.push({ code: 'FUNDING_HEADLINE_PARSE_FAILED', message: 'LLM headline invalid; kept fallback.' });
      return { text: fallback, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
    } catch (e) {
      warnings.push({ code: 'FUNDING_LLM_UNAVAILABLE', message: e instanceof Error ? e.message : 'LLM call failed' });
      return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    }
  }

  private async adviceOrFallback(
    r: EligibilityResult,
    profile: BusinessProfile,
    ctx: AgentContext,
    warnings: import('../../types/agent').AgentWarning[],
  ): Promise<{ text: string; used: boolean; tokensIn: number; tokensOut: number }> {
    const fallback = `To qualify: ${r.ruleMissed.join('; ')}.`;
    if (!this.llm) return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    try {
      const res = await this.llm.chat(
        [
          { role: 'system', content: 'You are a Caribbean funding advisor. Reply with JSON only: {"advice": "..."}' },
          { role: 'user', content: renderAlmostEligibleAdvicePrompt(r, profile) },
        ],
        { jsonMode: true, maxTokens: 100, temperature: 0.3, timeoutMs: ctx.budget.maxDurationMs },
      );
      const parsed = safeJson(res.content);
      if (parsed && typeof parsed === 'object' && 'advice' in parsed) {
        const a = (parsed as { advice: unknown }).advice;
        if (typeof a === 'string' && a.length > 0 && a.length < 240) {
          return { text: a, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
        }
      }
      warnings.push({ code: 'FUNDING_ADVICE_PARSE_FAILED', message: 'LLM advice invalid; kept fallback.' });
      return { text: fallback, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
    } catch (e) {
      warnings.push({ code: 'FUNDING_LLM_UNAVAILABLE', message: e instanceof Error ? e.message : 'LLM call failed' });
      return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    }
  }

  private async planSummaryOrFallback(
    outcome: EvaluationOutcome,
    profile: BusinessProfile,
    top: EligibilityResult,
    assessment: HealthAssessment,
    ctx: AgentContext,
    warnings: import('../../types/agent').AgentWarning[],
  ): Promise<{ text: string; used: boolean; tokensIn: number; tokensOut: number }> {
    const fallback = fallbackPlanSummaryForTop(outcome, profile, top);
    if (!this.llm) return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    try {
      const res = await this.llm.chat(
        [
          { role: 'system', content: 'You are a Caribbean funding advisor. Reply with JSON only: {"summary": "..."}' },
          { role: 'user', content: renderPlanSummaryPrompt(outcome, profile, top, assessment) },
        ],
        { jsonMode: true, maxTokens: 250, temperature: 0.3, timeoutMs: ctx.budget.maxDurationMs },
      );
      const parsed = safeJson(res.content);
      if (parsed && typeof parsed === 'object' && 'summary' in parsed) {
        const s = (parsed as { summary: unknown }).summary;
        if (typeof s === 'string' && s.length > 0 && s.length < 700) {
          return { text: s, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
        }
      }
      warnings.push({ code: 'FUNDING_SUMMARY_PARSE_FAILED', message: 'LLM summary invalid; kept fallback.' });
      return { text: fallback, used: true, tokensIn: res.tokensIn, tokensOut: res.tokensOut };
    } catch (e) {
      warnings.push({ code: 'FUNDING_LLM_UNAVAILABLE', message: e instanceof Error ? e.message : 'LLM call failed' });
      return { text: fallback, used: false, tokensIn: 0, tokensOut: 0 };
    }
  }
}

// ---------------------------------------------------------------------------
// Fallback templates
// ---------------------------------------------------------------------------

function fallbackHeadline(p: FundingProgram): string {
  const rate = p.interestRatePercent
    ? `at ${p.interestRatePercent.min}–${p.interestRatePercent.max}% over ${p.termMonths.min}–${p.termMonths.max} months`
    : `as a grant`;
  return `${p.name} offers up to ${p.maxLoanAmount.amount.toLocaleString()} ${p.maxLoanAmount.currency} ${rate}.`;
}

function fallbackPlanSummary(outcome: EvaluationOutcome, profile: BusinessProfile): string {
  if (outcome.eligible.length === 0 && outcome.almost.length === 0) {
    return `No Caribbean funding programs match this business's current profile. Improving cash flow and revenue predictability over the next 3-6 months would expand eligibility.`;
  }
  if (outcome.eligible.length === 0) {
    return `You're not yet eligible for any of the ${outcome.evaluated.length} Caribbean programs we evaluated, but you're close on ${outcome.almost.length}. Small improvements would unlock funding.`;
  }
  return `You're eligible for ${outcome.eligible.length} Caribbean funding program(s). The best fit is highlighted below.`;
}

function fallbackPlanSummaryForTop(
  outcome: EvaluationOutcome,
  profile: BusinessProfile,
  top: EligibilityResult,
): string {
  return `Recommended program: ${top.program.name} (${top.program.institution}). You're eligible for ${outcome.eligible.length} program(s) total. Apply through an approved financial institution, prepare your tax compliance certificate, and have your last 12 months of bank statements ready.`;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
