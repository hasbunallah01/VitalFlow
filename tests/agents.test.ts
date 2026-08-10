/**
 * Agent tests — Watcher + Insight Generation, mocked LLM.
 *
 * These tests exercise the agent LOGIC. The LLM is replaced with a
 * scripted MockLLMClient so the tests are deterministic and don't
 * need network or secrets.
 *
 * A separate live integration test (agents.live.test.ts) exercises
 * the full path against the real DeepSeek model — skipped if no key.
 */

import { describe, it, expect } from 'vitest';
import { WatcherAgent, type WatcherInput } from '../agents/watcher';
import { detectWatchEvents } from '../agents/watcher/rules';
import { InsightGenerationAgent } from '../agents/recommendation';
import { generateRawRecommendations } from '../agents/recommendation/rules';
import { MockLLMClient } from '../lib/llm/mock';
import { makeAssessment } from './_assessment_factory';

const XCD = 'XCD';

const ctx = {
  analysisId: 'a1', organizationId: 'org1', currency: XCD, locale: 'en-AG',
  budget: { maxTokens: 60000, maxDurationMs: 30000 },
};

// --- Watcher: deterministic rules ---------------------------------------------

describe('watcher rules: score change', () => {
  it('fires score_drop on a 5+ point decrease', () => {
    const curr = makeAssessment({ score: 70, band: 'healthy' });
    const prev = makeAssessment({ score: 80, band: 'strong' });
    const events = detectWatchEvents({ current: curr, previous: prev, history: [prev] });
    expect(events.some((e) => e.type === 'score_drop')).toBe(true);
  });

  it('does not fire on small fluctuations', () => {
    const curr = makeAssessment({ score: 76, band: 'healthy' });
    const prev = makeAssessment({ score: 75.4, band: 'healthy' });
    const events = detectWatchEvents({ current: curr, previous: prev, history: [prev] });
    expect(events.some((e) => e.type === 'score_drop' || e.type === 'score_rise')).toBe(false);
  });

  it('fires score_rise on a 5+ point increase', () => {
    const curr = makeAssessment({ score: 80, band: 'strong' });
    const prev = makeAssessment({ score: 72, band: 'healthy' });
    const events = detectWatchEvents({ current: curr, previous: prev, history: [prev] });
    expect(events.some((e) => e.type === 'score_rise')).toBe(true);
  });
});

describe('watcher rules: runway threshold', () => {
  it('fires when runway is below 1 month', () => {
    // Build an assessment with a negative end balance
    const curr = makeAssessment({ score: 40, band: 'watch', runwayMonths: 0.5, netFlows: [-2000, -3000, -2000, -3000, -2000, -3000, -2000, -3000, -2000, -3000, -2000, -2000], endingBalance: -1000 });
    const events = detectWatchEvents({ current: curr, previous: null, history: [curr] });
    expect(events.some((e) => e.type === 'threshold_crossed')).toBe(true);
  });

  it('does not fire when balance is positive', () => {
    const curr = makeAssessment({ score: 75, band: 'healthy' });
    const events = detectWatchEvents({ current: curr, previous: null, history: [curr] });
    expect(events.some((e) => e.type === 'threshold_crossed')).toBe(false);
  });
});

describe('watcher rules: funding tier change', () => {
  it('fires when tier changes (Building → NearReady)', () => {
    const curr = makeAssessment({ score: 65, band: 'watch' });
    const prev = makeAssessment({ score: 55, band: 'watch' });
    const events = detectWatchEvents({ current: curr, previous: prev, history: [prev] });
    expect(events.some((e) => e.type === 'funding_tier_change')).toBe(true);
  });
});

describe('watcher rules: first analysis', () => {
  it('returns only the events that fire without a previous analysis', () => {
    const curr = makeAssessment({ score: 75, band: 'healthy' });
    const events = detectWatchEvents({ current: curr, previous: null, history: [curr] });
    // No score change (no prev), no recurring broken (no prev), but balance anomaly
    // and threshold checks may fire depending on the data.
    expect(events.every((e) => e.type !== 'score_drop' && e.type !== 'score_rise')).toBe(true);
  });
});

// --- Watcher: full agent with mocked LLM -------------------------------------

describe('WatcherAgent with mocked LLM', () => {
  it('uses LLM summaries for high-confidence events', async () => {
    const mock = new MockLLMClient([
      { matchContains: 'health score fell', content: '{"summary": "Score fell sharply — investigate the recent NSF events."}' },
    ]);
    const agent = new WatcherAgent(mock);
    const input: WatcherInput = {
      current: makeAssessment({ score: 65, band: 'watch' }),
      previous: makeAssessment({ score: 80, band: 'strong' }),
      history: [],
    };
    const res = await agent.run(input, ctx);
    expect(res.ok).toBe(true);
    expect(res.data?.events.length).toBeGreaterThan(0);
    const dropEvent = res.data!.events.find((e) => e.type === 'score_drop');
    expect(dropEvent?.summary).toContain('Score fell sharply');
    expect(res.data?.llmUsed).toBe(true);
  });

  it('falls back to templated summary when LLM returns invalid JSON', async () => {
    const mock = new MockLLMClient([
      { content: 'not json' },
    ]);
    const agent = new WatcherAgent(mock);
    const input: WatcherInput = {
      current: makeAssessment({ score: 65, band: 'watch' }),
      previous: makeAssessment({ score: 80, band: 'strong' }),
      history: [],
    };
    const res = await agent.run(input, ctx);
    expect(res.ok).toBe(true);
    const dropEvent = res.data!.events.find((e) => e.type === 'score_drop');
    expect(dropEvent?.summary).toContain('Health score dropped by');
    expect(res.warnings.some((w) => w.code === 'WATCHER_LLM_PARSE_FAILED')).toBe(true);
  });

  it('emits no events for a clean re-run with no change', async () => {
    const mock = new MockLLMClient();
    const agent = new WatcherAgent(mock);
    const a = makeAssessment({ score: 75, band: 'healthy' });
    const input: WatcherInput = { current: a, previous: a, history: [a] };
    const res = await agent.run(input, ctx);
    expect(res.data?.events.length).toBe(0);
    expect(res.data?.llmUsed).toBe(false);
  });
});

// --- Insight Generation: rules -----------------------------------------------

describe('insight rules: customer concentration', () => {
  it('recommends diversification when HHI > 0.40', () => {
    const a = makeAssessment({ score: 75, band: 'healthy', hhi: 0.42 });
    const recs = generateRawRecommendations(a);
    expect(recs.some((r) => r.key === 'diversify_customers')).toBe(true);
  });

  it('does not recommend when HHI is healthy', () => {
    const a = makeAssessment({ score: 75, band: 'healthy', hhi: 0.18 });
    const recs = generateRawRecommendations(a);
    expect(recs.some((r) => r.key === 'diversify_customers')).toBe(false);
  });
});

describe('insight rules: NSF auto-pay', () => {
  it('recommends auto-pay on any returned payment', () => {
    const a = makeAssessment({ score: 70, band: 'watch', returnedPayments: 2 });
    const recs = generateRawRecommendations(a);
    expect(recs.some((r) => r.key === 'set_up_auto_pay')).toBe(true);
  });
});

describe('insight rules: revenue decline', () => {
  it('recommends reversing decline on a > 2% monthly drop', () => {
    const a = makeAssessment({ score: 70, band: 'watch', revenueTrend: -0.05 });
    const recs = generateRawRecommendations(a);
    expect(recs.some((r) => r.key === 'reverse_revenue_decline')).toBe(true);
  });
});

describe('insight rules: cap at 5', () => {
  it('returns at most 5 recommendations, sorted by priority', () => {
    // Construct a troubled assessment that should fire many rules
    const a = makeAssessment({
      score: 35, band: 'fragile',
      hhi: 0.6, fixedCover: 1.1, outflowCV: 0.5,
      discretionary: 0.18, revenueTrend: -0.04, recurringShare: 0.3,
      returnedPayments: 3, runwayMonths: 0.5,
      netFlows: [-1000, -1000, -1000, -1000, -1000, -1000, -1000, -1000, -1000, -1000, -1000, -1000],
      endingBalance: 500,
    });
    const recs = generateRawRecommendations(a);
    expect(recs.length).toBeLessThanOrEqual(5);
    // Sorted by priority ascending
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i]!.priority).toBeGreaterThanOrEqual(recs[i - 1]!.priority);
    }
  });
});

// --- Insight Generation: full agent with mocked LLM --------------------------

describe('InsightGenerationAgent with mocked LLM', () => {
  it('enriches rationales via LLM when available', async () => {
    const mock = new MockLLMClient([
      { content: '{"rationale": "Two NSF fees in one quarter suggest a recurring auto-pay gap. Setting up auto-pay for rent and utilities will eliminate this risk for less than an hour of setup."}' },
    ]);
    const agent = new InsightGenerationAgent(mock);
    const a = makeAssessment({ score: 70, band: 'watch', returnedPayments: 2 });
    const res = await agent.run({ analysis: a }, ctx);
    expect(res.ok).toBe(true);
    expect(res.data!.recommendations.length).toBeGreaterThan(0);
    const autoPay = res.data!.recommendations.find((r) => r.key === 'set_up_auto_pay');
    expect(autoPay?.rationale).toContain('auto-pay');
    expect(res.data?.llmUsed).toBe(true);
  });

  it('returns templated rationales when LLM call fails', async () => {
    // Empty responses cause the mock to echo the user message — but the
    // agent tries to parse it as JSON and falls back gracefully.
    const mock = new MockLLMClient([{ content: 'definitely not json' }]);
    const agent = new InsightGenerationAgent(mock);
    const a = makeAssessment({ score: 75, band: 'healthy' });
    const res = await agent.run({ analysis: a }, ctx);
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => w.code === 'INSIGHT_RATIONALE_PARSE_FAILED')).toBe(true);
    // All recommendations have a non-empty rationale (the fallback)
    for (const r of res.data!.recommendations) {
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });
});

// --- LLM client / mock mechanics ---------------------------------------------

describe('MockLLMClient', () => {
  it('echoes the user message in echo mode', async () => {
    const m = new MockLLMClient();
    const res = await m.chat([{ role: 'user', content: 'hello' }]);
    expect(res.content).toBe('hello');
  });

  it('returns scripted responses in order', async () => {
    const m = new MockLLMClient([
      { content: 'first' },
      { content: 'second' },
    ]);
    expect((await m.chat([{ role: 'user', content: 'x' }])).content).toBe('first');
    expect((await m.chat([{ role: 'user', content: 'y' }])).content).toBe('second');
  });

  it('matches on user content', async () => {
    const m = new MockLLMClient([
      { matchContains: 'foo', content: 'matched foo' },
      { matchContains: 'bar', content: 'matched bar' },
    ]);
    expect((await m.chat([{ role: 'user', content: 'I want foo' }])).content).toBe('matched foo');
    expect((await m.chat([{ role: 'user', content: 'I want bar' }])).content).toBe('matched bar');
  });

  it('records all calls', async () => {
    const m = new MockLLMClient([{ content: 'r1' }]);
    await m.chat([{ role: 'user', content: 'a' }]);
    await m.chat([{ role: 'user', content: 'b' }]);
    expect(m.callCount).toBe(2);
  });
});
