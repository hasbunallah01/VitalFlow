/**
 * Live Resend integration test.
 *
 * Opt-in ONLY. Skips unless:
 *   - RESEND_LIVE_TEST=1
 *   - RESEND_API_KEY is set
 *   - RESEND_FROM_EMAIL is set
 *   - RESEND_TEST_TO is set (a real email address you control)
 *
 * Set RESEND_LIVE_TEST=0 or leave it unset to skip. This is intentional
 * — we don't want unit-test runs to fire real emails.
 *
 *   RESEND_LIVE_TEST=1 \
 *   RESEND_API_KEY=re_xxx \
 *   RESEND_FROM_EMAIL=noreply@vitalflow.haybee.xyz \
 *   RESEND_TEST_TO=your@email.com \
 *   pnpm vitest run lib/email/resend.live.test.ts
 */

import { describe, it, expect } from 'vitest';
import { sendWatcherAlert, renderWatcherAlert, loadResendConfig } from './resend';

const ENABLED =
  process.env.RESEND_LIVE_TEST === '1' &&
  !!process.env.RESEND_API_KEY &&
  !!process.env.RESEND_FROM_EMAIL &&
  !!process.env.RESEND_TEST_TO;

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);

describeIf(ENABLED)('Resend live (opt-in)', () => {
  it('sends a real Watcher alert email to the test recipient', async () => {
    const cfg = loadResendConfig();
    expect(cfg).not.toBeNull();

    const result = await sendWatcherAlert({
      to: process.env.RESEND_TEST_TO!,
      businessName: 'VitalFlow Live Test Caterer',
      event: {
        id: 'wev_live_1',
        eventType: 'score_drop',
        summary:
          '[live test] Your health score fell by 12 points. Net cash flow was negative for 2 of the last 3 months.',
        evidence: { delta: 12, currency: 'XCD' },
        createdAt: new Date(),
      },
      siblingEvents: [],
      analysis: {
        score: 62.7,
        band: 'Watch',
        periodStart: '2025-07-03',
        periodEnd: '2026-06-29',
        monthsAnalyzed: 12,
        currency: 'XCD',
      },
      dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/live_test',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.id).toMatch(/^[a-z0-9_]+$/);
    expect(result.httpStatus).toBe(200);
  }, 30_000);

  it('renderWatcherAlert produces non-empty text and html', () => {
    const out = renderWatcherAlert({
      to: 'a@example.com',
      businessName: 'B',
      event: {
        id: 'e1',
        eventType: 'score_rise',
        summary: 'Score improved.',
        evidence: {},
        createdAt: new Date(),
      },
      siblingEvents: [],
      analysis: {
        score: 80,
        band: 'Healthy',
        periodStart: '2025-07-03',
        periodEnd: '2026-06-29',
        monthsAnalyzed: 12,
        currency: 'XCD',
      },
      dashboardUrl: 'https://vitalflow.haybee.xyz/analysis/x',
    });
    expect(out.subject.length).toBeGreaterThan(0);
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.html.length).toBeGreaterThan(0);
    expect(out.html).toContain('<!doctype html>');
  });
});
