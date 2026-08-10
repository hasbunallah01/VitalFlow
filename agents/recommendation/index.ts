/**
 * Insight Generation Agent — produces ranked recommendations.
 *
 * Takes a HealthAssessment and emits up to 5 actionable recommendations.
 * The actions themselves are pre-computed deterministically (see
 * ./rules.ts); the LLM is only asked to polish the one-sentence
 * rationale that goes with each one.
 *
 * Degradation: if the LLM is unavailable, every recommendation still
 * ships with its templated rationale. The user still gets value.
 */

import type { Agent, AgentContext, AgentResult } from '../../types/agent';
import type { HealthAssessment } from '../../types/analysis';
import type { LLMClient } from '../../lib/llm/client';
import { generateRawRecommendations, type RawRecommendation } from './rules';
import { renderRecommendationPrompt } from './prompts';

export interface RecommendationInput {
  analysis: HealthAssessment;
}

export interface RecommendationRow {
  key: string;
  action: string;
  rationale: string;
  pillar: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  estimatedPointGain: number;
  timeframe: string;
}

export interface RecommendationOutput {
  recommendations: RecommendationRow[];
  tokensIn: number;
  tokensOut: number;
  llmUsed: boolean;
}

export const INSIGHT_AGENT = 'insight-generation';
export const INSIGHT_VERSION = '1.0.0';

export class InsightGenerationAgent implements Agent<RecommendationInput, RecommendationOutput> {
  readonly name = INSIGHT_AGENT;
  readonly version = INSIGHT_VERSION;
  readonly usesLLM = true;

  constructor(private readonly llm: LLMClient) {}

  async run(
    input: RecommendationInput,
    ctx: AgentContext,
  ): Promise<AgentResult<RecommendationOutput>> {
    const start = Date.now();
    const warnings: import('../../types/agent').AgentWarning[] = [];
    const errors: import('../../types/agent').AgentError[] = [];
    let llmUsed = false;
    let tokensIn = 0;
    let tokensOut = 0;

    const raw = generateRawRecommendations(input.analysis);
    const recommendations: RecommendationRow[] = [];

    for (const r of raw) {
      let rationale = r.fallbackRationale;
      if (this.llm) {
        try {
          const prompt = renderRecommendationPrompt(r, input.analysis);
          const res = await this.llm.chat(
            [
              {
                role: 'system',
                content: 'You are a financial coach for Caribbean small businesses. Reply with JSON only: {"rationale": "..."}',
              },
              { role: 'user', content: prompt },
            ],
            { jsonMode: true, maxTokens: 140, temperature: 0.3, timeoutMs: ctx.budget.maxDurationMs },
          );
          llmUsed = true;
          tokensIn += res.tokensIn;
          tokensOut += res.tokensOut;
          const parsed = safeJson(res.content);
          if (parsed && typeof parsed === 'object' && 'rationale' in parsed) {
            const v = (parsed as { rationale: unknown }).rationale;
            if (typeof v === 'string' && v.length > 0 && v.length < 320) {
              rationale = v;
            } else {
              warnings.push({ code: 'INSIGHT_RATIONALE_BAD_LENGTH', message: 'LLM rationale length out of bounds; kept fallback.' });
            }
          } else {
            warnings.push({ code: 'INSIGHT_RATIONALE_PARSE_FAILED', message: 'LLM response was not the expected JSON shape; kept fallback.' });
          }
        } catch (e) {
          warnings.push({
            code: 'INSIGHT_LLM_UNAVAILABLE',
            message: e instanceof Error ? e.message : 'LLM call failed',
          });
        }
      }
      recommendations.push({
        key: r.key,
        action: r.action,
        rationale,
        pillar: r.pillar,
        priority: r.priority,
        effort: r.effort,
        estimatedPointGain: r.estimatedPointGain,
        timeframe: timeframeFor(r.priority),
      });
    }

    return {
      ok: errors.length === 0,
      data: { recommendations, tokensIn, tokensOut, llmUsed },
      warnings,
      errors,
      confidence: recommendations.length === 0 ? 1.0 : 0.8,
      meta: {
        agent: this.name,
        agentVersion: this.version,
        promptId: 'insight-generation@v1',
        model: llmUsed ? this.llm.defaultModel : undefined,
        tokensIn,
        tokensOut,
        durationMs: Date.now() - start,
      },
    };
  }
}

function timeframeFor(priority: number): string {
  if (priority <= 1) return 'this week';
  if (priority === 2) return 'this month';
  if (priority === 3) return 'next quarter';
  return 'when capacity allows';
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
