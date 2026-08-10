/**
 * Watcher Agent.
 *
 * Detects material changes between the current analysis and prior
 * history, and writes a WatchEvent row for each one. The trigger
 * logic is deterministic (agents/watcher/rules.ts); the LLM is
 * consulted only to write a one-sentence human-readable summary.
 *
 * Per docs/AGENTS.md rule 4: "Always accountable. Every execution
 * writes an AgentRun record." The caller is responsible for
 * persisting the AgentRun; this agent just returns the result.
 *
 * Degradation: if the LLM is unavailable, every event still fires
 * with a templated summary. The pipeline never fails because the
 * model is down.
 */

import type { Agent, AgentContext, AgentResult } from '../../types/agent';
import type { HealthAssessment } from '../../types/analysis';
import type { LLMClient } from '../../lib/llm/client';
import { detectWatchEvents, type DetectedEvent } from './rules';
import { renderWatchPrompt } from './prompts';

export interface WatcherInput {
  current: HealthAssessment;
  previous: HealthAssessment | null;
  history: HealthAssessment[];
}

export interface WatcherOutput {
  /** One entry per detected event, ready to insert as a WatchEvent row. */
  events: Array<{
    type: import('@prisma/client').WatchEventType;
    summary: string;
    evidence: Record<string, string | number>;
    confidence: number;
  }>;
  /** Tokens consumed by the LLM for summaries. */
  tokensIn: number;
  tokensOut: number;
  /** Whether the LLM was used (false = all templated summaries). */
  llmUsed: boolean;
}

export const WATCHER_AGENT = 'watcher';
export const WATCHER_VERSION = '1.0.0';

export class WatcherAgent implements Agent<WatcherInput, WatcherOutput> {
  readonly name = WATCHER_AGENT;
  readonly version = WATCHER_VERSION;
  readonly usesLLM = true;

  constructor(private readonly llm: LLMClient) {}

  async run(input: WatcherInput, ctx: AgentContext): Promise<AgentResult<WatcherOutput>> {
    const start = Date.now();
    const warnings: import('../../types/agent').AgentWarning[] = [];
    const errors: import('../../types/agent').AgentError[] = [];
    let llmUsed = false;
    let tokensIn = 0;
    let tokensOut = 0;

    const detected: DetectedEvent[] = detectWatchEvents(input);

    const events: WatcherOutput['events'] = [];
    for (const d of detected) {
      let summary = d.fallbackSummary;
      if (this.llm && d.confidence >= 0.6) {
        try {
          const prompt = renderWatchPrompt(d, input);
          const res = await this.llm.chat(
            [
              {
                role: 'system',
                content: 'You are a financial analyst for Caribbean small businesses. Reply with JSON only: {"summary": "..."}',
              },
              { role: 'user', content: prompt },
            ],
            { jsonMode: true, maxTokens: 120, temperature: 0.3, timeoutMs: ctx.budget.maxDurationMs },
          );
          llmUsed = true;
          tokensIn += res.tokensIn;
          tokensOut += res.tokensOut;
          const parsed = safeJson(res.content);
          if (parsed && typeof parsed === 'object' && 'summary' in parsed) {
            const s = (parsed as { summary: unknown }).summary;
            if (typeof s === 'string' && s.length > 0 && s.length < 280) {
              summary = s;
            } else {
              warnings.push({ code: 'WATCHER_LLM_SUMMARY_BAD_LENGTH', message: 'LLM summary length out of bounds; kept fallback.' });
            }
          } else {
            warnings.push({ code: 'WATCHER_LLM_PARSE_FAILED', message: 'LLM response was not the expected JSON shape; kept fallback.' });
          }
        } catch (e) {
          // LLM failure is recoverable. The event still fires with the fallback summary.
          warnings.push({
            code: 'WATCHER_LLM_UNAVAILABLE',
            message: e instanceof Error ? e.message : 'LLM call failed',
          });
        }
      }
      events.push({
        type: d.type,
        summary,
        evidence: d.facts,
        confidence: d.confidence,
      });
    }

    return {
      ok: errors.length === 0,
      data: { events, tokensIn, tokensOut, llmUsed },
      warnings,
      errors,
      confidence: events.length === 0 ? 1.0 : minConfidence(events),
      meta: {
        agent: this.name,
        agentVersion: this.version,
        promptId: 'watcher@v1',
        model: llmUsed ? this.llm.defaultModel : undefined,
        tokensIn,
        tokensOut,
        durationMs: Date.now() - start,
      },
    };
  }
}

function minConfidence(events: ReadonlyArray<{ confidence: number }>): number {
  let m = 1;
  for (const e of events) if (e.confidence < m) m = e.confidence;
  return m;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
