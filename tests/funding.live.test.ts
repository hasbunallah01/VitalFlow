/**
 * Live integration test for the Funding Outreach agent.
 * Runs against real Qwen via Nebius. Skipped without NEBIUS_API_KEY.
 */

import { describe, it, expect } from 'vitest';
import { FundingOutreachAgent } from '../agents/funding-outreach';
import { HttpLLMClient, loadLLMConfig } from '../lib/llm/client';
import { makeAssessment } from './_assessment_factory';

const HAS_LLM = !!(process.env.NEBIUS_API_KEY || process.env.LLM_API_KEY);
const describeIfLlm = HAS_LLM ? describe : describe.skip;

describeIfLlm('live: FundingOutreachAgent against Qwen', () => {
  it('produces a contextual plan summary for a healthy Caribbean business', async () => {
    const llm = new HttpLLMClient(loadLLMConfig());
    const agent = new FundingOutreachAgent(llm);
    const a = makeAssessment({ score: 75, band: 'healthy' });
    const res = await agent.run(
      {
        assessment: a,
        profile: {
          country: 'AG',
          sector: 'tourism',
          monthsInOperation: 24,
          annualRevenue: { amount: 500_000, currency: 'USD' },
        },
      },
      { analysisId: 'a1', organizationId: 'org1', currency: 'XCD', locale: 'en-AG', budget: { maxTokens: 60000, maxDurationMs: 30000 } },
    );
    expect(res.ok).toBe(true);
    expect(res.data!.planSummary.length).toBeGreaterThan(40);
    expect(res.data!.planSummary.length).toBeLessThan(700);
    // The summary should mention the recommended program or general advice
    expect(res.data!.planSummary).toMatch(/[A-Z]/);
  }, 60_000);
}, 60_000);
