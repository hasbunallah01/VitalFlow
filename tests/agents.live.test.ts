/**
 * Live integration test for the agents — runs against real DeepSeek via Nebius.
 *
 * Skipped automatically when NEBIUS_API_KEY (or LLM_API_KEY) is not set,
 * so plain `vitest run` without secrets stays green.
 *
 * Run with:
 *   NEBIUS_API_KEY=... ./node_modules/.bin/vitest run tests/agents.live.test.ts
 */

import { describe, it, expect } from 'vitest';
import { WatcherAgent } from '../agents/watcher';
import { InsightGenerationAgent } from '../agents/recommendation';
import { HttpLLMClient, loadLLMConfig } from '../lib/llm/client';
import { makeAssessment } from './_assessment_factory';

const HAS_LLM = !!(process.env.NEBIUS_API_KEY || process.env.LLM_API_KEY);
const describeIfLlm = HAS_LLM ? describe : describe.skip;

describeIfLlm('live: WatcherAgent against DeepSeek', () => {
  it('produces a coherent score_drop summary', async () => {
    const llm = new HttpLLMClient(loadLLMConfig());
    const agent = new WatcherAgent(llm);
    const curr = makeAssessment({ score: 60, band: 'watch' });
    const prev = makeAssessment({ score: 80, band: 'strong' });
    const res = await agent.run(
      { current: curr, previous: prev, history: [prev] },
      { analysisId: 'a1', organizationId: 'org1', currency: 'XCD', locale: 'en-AG', budget: { maxTokens: 60000, maxDurationMs: 30000 } },
    );
    expect(res.ok).toBe(true);
    const drop = res.data?.events.find((e) => e.type === 'score_drop');
    expect(drop).toBeDefined();
    expect(drop!.summary.length).toBeGreaterThan(10);
    expect(drop!.summary.length).toBeLessThan(280);
    // The summary must mention a real number, not be generic.
    expect(drop!.summary).toMatch(/\d/);
  }, 60_000);
}, 60_000);

describeIfLlm('live: InsightGenerationAgent against DeepSeek', () => {
  it('produces a contextual rationale for auto-pay recommendation', async () => {
    const llm = new HttpLLMClient(loadLLMConfig());
    const agent = new InsightGenerationAgent(llm);
    const a = makeAssessment({ score: 70, band: 'watch', returnedPayments: 2 });
    const res = await agent.run(
      { analysis: a },
      { analysisId: 'a1', organizationId: 'org1', currency: 'XCD', locale: 'en-AG', budget: { maxTokens: 60000, maxDurationMs: 30000 } },
    );
    expect(res.ok).toBe(true);
    const autoPay = res.data?.recommendations.find((r) => r.key === 'set_up_auto_pay');
    expect(autoPay).toBeDefined();
    expect(autoPay!.rationale.length).toBeGreaterThan(20);
    expect(autoPay!.rationale.length).toBeLessThan(320);
  }, 60_000);
}, 60_000);
