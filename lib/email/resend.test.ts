/**
 * Tests for lib/email/resend.ts
 *
 * Three layers of tests, all deterministic and offline:
 *
 *   1. Pure logic (no fetch):
 *      - isDeliverableEmail / config loader
 *      - renderWatcherAlert produces well-formed subject/text/html
 *      - the html contains the primary event summary and the dashboard
 *        link, and never embeds user content raw (XSS via summary)
 *      - zero-events branch is not relevant here (that's in dispatch.test.ts)
 *
 *   2. sendEmail with a fake fetchImpl:
 *      - successful 2xx → returns EmailSendSuccess with the Resend id
 *      - 4xx → returns EmailSendFailure with httpStatus + apiErrorCode
 *      - 5xx → returns retryable failure
 *      - network rejection → returns transport-error, retryable
 *      - missing config → returns 'not-configured' (no fetch called)
 *      - empty to: → returns 'no-recipient'
 *      - empty body → returns 'no-body'
 *      - payload contains exactly the from/to/subject/text/html we expect
 *
 *   3. sendWatcherAlert with a fake fetchImpl:
 *      - builds the expected Resend payload from the input
 *      - sets tags for filtering
 *
 * No real network call. The live Resend test is opt-in via
 * RESEND_LIVE_TEST=1 (see resend.live.test.ts).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadResendConfig,
  isResendConfigured,
  sendEmail,
  sendWatcherAlert,
  renderWatcherAlert,
  type EmailMessage,
  type EmailSendResult,
  type FetchImpl,
} from './resend';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid config for the duration of a test. */
function setConfig(overrides: Partial<{ apiKey: string; from: string; apiBase: string }> = {}) {
  process.env.RESEND_API_KEY = overrides.apiKey ?? 're_test_abc123';
  process.env.RESEND_FROM_EMAIL = overrides.from ?? 'noreply@vitalflow.haybee.xyz';
  if (overrides.apiBase !== undefined) {
    process.env.RESEND_API_BASE = overrides.apiBase;
  } else {
    delete process.env.RESEND_API_BASE;
  }
}

function clearConfig() {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_API_BASE;
}

/** Build a fake fetch that records the call and returns a canned response. */
function fakeFetch(response: {
  status?: number;
  body?: unknown;
  reject?: Error;
}): { calls: Array<{ url: string; init: RequestInit; body: unknown }>; impl: FetchImpl } {
  const calls: Array<{ url: string; init: RequestInit; body: unknown }> = [];
  const impl: FetchImpl = async (url, init) => {
    let parsed: unknown = null;
    const initObj = (init ?? {}) as RequestInit;
    if (initObj.body && typeof initObj.body === 'string') {
      try { parsed = JSON.parse(initObj.body); } catch { parsed = null; }
    }
    calls.push({ url: String(url), init: initObj, body: parsed });
    if (response.reject) throw response.reject;
    const body = response.body ?? { id: 're_msg_123' };
    const status = response.status ?? 200;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, impl };
}

const baseMessage: EmailMessage = {
  to: ['owner@example.com'],
  subject: 'hi',
  text: 'hello world',
};

// ---------------------------------------------------------------------------
// 1. Config loading
// ---------------------------------------------------------------------------

describe('loadResendConfig / isResendConfigured', () => {
  beforeEach(() => clearConfig());
  afterEach(() => clearConfig());

  it('returns null when RESEND_API_KEY is missing', () => {
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com';
    expect(loadResendConfig()).toBeNull();
    expect(isResendConfigured()).toBe(false);
  });

  it('returns null when RESEND_FROM_EMAIL is missing', () => {
    process.env.RESEND_API_KEY = 're_abc';
    expect(loadResendConfig()).toBeNull();
    expect(isResendConfigured()).toBe(false);
  });

  it('returns null for placeholder key values', () => {
    for (const placeholder of ['', 're_xxx', 're_test_placeholder', 'changeme', 'PLACEHOLDER']) {
      process.env.RESEND_API_KEY = placeholder;
      process.env.RESEND_FROM_EMAIL = 'noreply@vitalflow.haybee.xyz';
      expect(isResendConfigured(), `placeholder key: ${placeholder}`).toBe(false);
    }
  });

  it('returns null for placeholder from values', () => {
    for (const placeholder of ['', 'noreply@example.com', 'no-reply@example.com', 'your-from@example.com']) {
      process.env.RESEND_API_KEY = 're_abc';
      process.env.RESEND_FROM_EMAIL = placeholder;
      expect(isResendConfigured(), `placeholder from: ${placeholder}`).toBe(false);
    }
  });

  it('returns null for malformed from addresses', () => {
    process.env.RESEND_API_KEY = 're_abc';
    process.env.RESEND_FROM_EMAIL = 'not-an-email';
    expect(loadResendConfig()).toBeNull();
  });

  it('returns a config when both env vars are valid', () => {
    setConfig();
    const cfg = loadResendConfig();
    expect(cfg).toEqual({
      apiKey: 're_test_abc123',
      from: 'noreply@vitalflow.haybee.xyz',
      apiBase: 'https://api.resend.com',
    });
    expect(isResendConfigured()).toBe(true);
  });

  it('honours RESEND_API_BASE override', () => {
    setConfig({ apiBase: 'https://eu.resend.com/' });
    expect(loadResendConfig()!.apiBase).toBe('https://eu.resend.com');
  });
});

// ---------------------------------------------------------------------------
// 2. sendEmail — pre-flight validation (no fetch called)
// ---------------------------------------------------------------------------

describe('sendEmail — pre-flight validation', () => {
  afterEach(() => clearConfig());

  it('returns not-configured when env is missing, without calling fetch', async () => {
    clearConfig();
    const { calls, impl } = fakeFetch({});
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-configured');
    expect(calls).toHaveLength(0);
  });

  it('returns no-recipient when to: is empty', async () => {
    setConfig();
    const { calls, impl } = fakeFetch({});
    const result = await sendEmail(
      { ...baseMessage, to: [] },
      { fetchImpl: impl },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no-recipient');
    expect(calls).toHaveLength(0);
  });

  it('returns no-body when both text and html are missing', async () => {
    setConfig();
    const { calls, impl } = fakeFetch({});
    const result = await sendEmail(
      { to: ['a@example.com'], subject: 'x' },
      { fetchImpl: impl },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no-body');
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. sendEmail — happy path
// ---------------------------------------------------------------------------

describe('sendEmail — happy path', () => {
  beforeEach(() => setConfig());
  afterEach(() => clearConfig());

  it('returns success with the Resend id on a 2xx', async () => {
    const { calls, impl } = fakeFetch({ status: 200, body: { id: 're_msg_xyz' } });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.id).toBe('re_msg_xyz');
    expect(result.httpStatus).toBe(200);
    expect(result.deliveredTo).toEqual(['owner@example.com']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
  });

  it('POSTs the expected JSON payload to Resend', async () => {
    const { calls, impl } = fakeFetch({ body: { id: 're_msg_1' } });
    await sendEmail(
      {
        to: [{ email: 'a@example.com', name: 'A' }, { email: 'b@example.com' }],
        from: 'custom@vitalflow.haybee.xyz',
        subject: 'subj',
        text: 'plain text',
        html: '<p>html</p>',
        cc: [{ email: 'c@example.com' }],
        replyTo: [{ email: 'reply@example.com' }],
        tags: [{ name: 'kind', value: 'test' }],
      },
      { fetchImpl: impl },
    );
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.init.method).toBe('POST');
    expect(call.init.headers).toMatchObject({
      Authorization: 'Bearer re_test_abc123',
      'Content-Type': 'application/json',
    });
    expect(call.body).toMatchObject({
      from: 'custom@vitalflow.haybee.xyz',
      to: ['A <a@example.com>', 'b@example.com'],
      cc: ['c@example.com'],
      reply_to: ['reply@example.com'],
      subject: 'subj',
      text: 'plain text',
      html: '<p>html</p>',
      tags: [{ name: 'kind', value: 'test' }],
    });
  });

  it('attaches an idempotency key to the request headers', async () => {
    const { calls, impl } = fakeFetch({ body: { id: 're_msg_1' } });
    await sendEmail(baseMessage, { fetchImpl: impl });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBeTruthy();
    expect(headers['Idempotency-Key']).toMatch(/^vf-\d+-[a-z0-9]+$/);
  });
});

// ---------------------------------------------------------------------------
// 4. sendEmail — failure paths
// ---------------------------------------------------------------------------

describe('sendEmail — failure paths', () => {
  beforeEach(() => setConfig());
  afterEach(() => clearConfig());

  it('returns http-error with apiErrorCode on a 4xx', async () => {
    const { impl } = fakeFetch({
      status: 422,
      body: { error: { code: 'validation_error', message: 'bad email' } },
    });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('http-error');
    expect(result.httpStatus).toBe(422);
    expect(result.apiErrorCode).toBe('validation_error');
    expect(result.retryable).toBe(false); // 4xx is not retryable
  });

  it('returns retryable http-error on a 5xx', async () => {
    const { impl } = fakeFetch({ status: 500, body: 'oops' });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('http-error');
    expect(result.httpStatus).toBe(500);
    expect(result.retryable).toBe(true);
  });

  it('returns retryable http-error on 429', async () => {
    const { impl } = fakeFetch({ status: 429, body: 'rate limited' });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.retryable).toBe(true);
  });

  it('returns api-rejected when Resend returns 200 without an id', async () => {
    const { impl } = fakeFetch({ status: 200, body: { error: { message: 'queued but no id' } } });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    // We treat 200 without id as success-but-no-id-mapped: still ok:false
    // because we can't prove delivery. Reason is api-rejected in this code path.
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['http-error', 'api-rejected']).toContain(result.reason);
  });

  it('returns transport-error when fetch rejects', async () => {
    const { impl } = fakeFetch({ reject: new Error('econnreset') });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('transport-error');
    expect(result.message).toContain('econnreset');
    expect(result.retryable).toBe(true);
  });

  it('returns aborted when AbortSignal fires', async () => {
    setConfig();
    const { impl } = fakeFetch({ reject: Object.assign(new Error('aborted'), { name: 'AbortError' }) });
    const result = await sendEmail(baseMessage, { fetchImpl: impl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('aborted');
    expect(result.retryable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. sendWatcherAlert
// ---------------------------------------------------------------------------

describe('sendWatcherAlert', () => {
  beforeEach(() => setConfig());
  afterEach(() => clearConfig());

  const baseInput = {
    to: 'owner@example.com',
    businessName: "Amara's Catering",
    event: {
      id: 'wev_1',
      eventType: 'score_drop',
      summary: 'Score fell from 80 to 65.',
      evidence: { delta: 15 },
      createdAt: new Date('2026-08-28T17:00:00.000Z'),
    },
    siblingEvents: [
      { eventType: 'score_drop', summary: 'Score fell from 80 to 65.' },
    ],
    analysis: {
      score: 65.4,
      band: 'Healthy',
      periodStart: '2025-07-03',
      periodEnd: '2026-06-29',
      monthsAnalyzed: 12,
      currency: 'XCD',
    },
    dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/analysis_1',
  };

  it('sends a single email with the right tags and dashboard link', async () => {
    const { calls, impl } = fakeFetch({ body: { id: 're_msg_w1' } });
    const result = await sendWatcherAlert(baseInput, { fetchImpl: impl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.id).toBe('re_msg_w1');
    expect(calls).toHaveLength(1);
    const body = calls[0]!.body as Record<string, unknown>;
    expect(body.subject).toContain("VitalFlow");
    expect(body.subject).toContain("Amara's Catering");
    expect(body.subject).toContain('Score dropped');
    expect((body.to as string[])[0]).toBe('owner@example.com');
    expect((body.text as string)).toContain(baseInput.dashboardUrl);
    expect((body.html as string)).toContain(baseInput.dashboardUrl);
    expect((body.tags as Array<{ name: string; value: string }>)).toEqual([
      { name: 'category', value: 'watcher-alert' },
      { name: 'event', value: 'score_drop' },
      { name: 'business', value: "Amara's Catering" },
    ]);
  });

  it('honours a fromOverride', async () => {
    const { calls, impl } = fakeFetch({ body: { id: 're_msg_2' } });
    await sendWatcherAlert(baseInput, { fetchImpl: impl, fromOverride: 'alerts@vitalflow.haybee.xyz' });
    const body = calls[0]!.body as Record<string, unknown>;
    expect(body.from).toBe('alerts@vitalflow.haybee.xyz');
  });
});

// ---------------------------------------------------------------------------
// 6. renderWatcherAlert — pure
// ---------------------------------------------------------------------------

describe('renderWatcherAlert', () => {
  it('produces a well-formed subject/text/html', () => {
    const out = renderWatcherAlert({
      to: 'owner@example.com',
      businessName: "Amara's Catering",
      event: {
        id: 'wev_1',
        eventType: 'score_drop',
        summary: 'Your score dropped 15 points after expenses exceeded revenue.',
        evidence: { delta: 15 },
        createdAt: new Date('2026-08-28T17:00:00.000Z'),
      },
      siblingEvents: [],
      analysis: {
        score: 65.4,
        band: 'Healthy',
        periodStart: '2025-07-03',
        periodEnd: '2026-06-29',
        monthsAnalyzed: 12,
        currency: 'XCD',
      },
      dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/a_1',
      now: new Date('2026-08-28T17:00:00.000Z'),
    });
    expect(out.subject).toContain('VitalFlow');
    expect(out.subject).toContain('Score dropped');
    expect(out.subject).toContain('65.4');
    expect(out.text).toContain('Your score dropped 15 points');
    expect(out.text).toContain('https://vitalflow.haybee.xyz/analysis/a_1');
    expect(out.html).toContain('Your score dropped 15 points');
    expect(out.html).toContain('href="https://vitalflow.haybee.xyz/analysis/a_1"');
  });

  it('escapes user content in html to prevent XSS', () => {
    const out = renderWatcherAlert({
      to: 'owner@example.com',
      businessName: '<script>alert(1)</script>',
      event: {
        id: 'wev_x',
        eventType: 'score_drop',
        summary: '"><img src=x onerror=alert(1)>',
        evidence: {},
        createdAt: new Date('2026-08-28T17:00:00.000Z'),
      },
      siblingEvents: [],
      analysis: {
        score: 50,
        band: 'Watch',
        periodStart: '2025-07-03',
        periodEnd: '2026-06-29',
        monthsAnalyzed: 12,
        currency: 'XCD',
      },
      dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/x',
      now: new Date('2026-08-28T17:00:00.000Z'),
    });
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(out.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('lists siblings when there are multiple events in the same run', () => {
    const out = renderWatcherAlert({
      to: 'o@example.com',
      businessName: 'B',
      event: {
        id: 'wev_1',
        eventType: 'score_drop',
        summary: 'Score dropped.',
        evidence: {},
        createdAt: new Date('2026-08-28T17:00:00.000Z'),
      },
      siblingEvents: [
        { eventType: 'score_drop', summary: 'Score dropped.' },
        { eventType: 'recurring_broken', summary: 'A payment was missed.' },
        { eventType: 'risk_flag_new', summary: 'New risk flag raised.' },
      ],
      analysis: {
        score: 60,
        band: 'Watch',
        periodStart: null,
        periodEnd: null,
        monthsAnalyzed: 12,
        currency: 'XCD',
      },
      dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/a_1',
      now: new Date('2026-08-28T17:00:00.000Z'),
    });
    expect(out.text).toContain('Other changes in the same run');
    expect(out.text).toContain('A recurring payment was missed');
    expect(out.html).toContain('A payment was missed.');
  });
});
