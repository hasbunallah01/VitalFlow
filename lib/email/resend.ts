/**
 * VitalFlow — Resend email client.
 *
 * Server-only. The Resend API key is read from `process.env.RESEND_API_KEY`
 * and is NEVER exposed to the browser or any client-side bundle. The
 * "next/headers" check below is defensive: this file must not be imported
 * by a 'use client' component.
 *
 * Why a hand-rolled HTTP client instead of the `resend` SDK?
 *  - Zero new dependencies to keep the Vercel install lean.
 *  - Resend's API is a single POST to /emails. Two fields of payload.
 *  - We get to type the result exactly, including failure modes the SDK
 *    sometimes smooths over (e.g. 422 vs 5xx).
 *  - Determinism: every test can inject a custom `fetchImpl` to assert
 *    exactly what was sent.
 *
 * Return shape (EmailSendResult) is intentionally verbose — the caller
 * is the orchestrator and the audit log, both of which need to know
 * whether to set `notifiedAt` and what to record on failure.
 */

import 'server-only';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  /** Sender — uses RESEND_FROM_EMAIL by default; can be overridden per call. */
  from?: EmailAddress | string;
  /** Recipient(s). At least one required. */
  to: EmailAddress[] | string[];
  /** CC (optional). */
  cc?: EmailAddress[] | string[];
  /** BCC (optional). */
  bcc?: EmailAddress[] | string[];
  /** Reply-To (optional). */
  replyTo?: EmailAddress[] | string[];
  /** Subject line. */
  subject: string;
  /** Plain-text body. Required unless html is provided. */
  text?: string;
  /** HTML body. Required unless text is provided. */
  html?: string;
  /** Resend tags (up to 10). We use this to mark watcher alerts for filtering. */
  tags?: Array<{ name: string; value: string }>;
  /** Resend scheduled send time (ISO 8601). Optional — we never schedule. */
  scheduledAt?: string;
  /** Resend headers (advanced). */
  headers?: Record<string, string>;
}

export type EmailFailureReason =
  | 'not-configured' // RESEND_API_KEY missing or placeholder
  | 'invalid-config' // RESEND_FROM_EMAIL missing or placeholder
  | 'no-recipient' // to: [] or empty
  | 'no-body' // both text and html missing
  | 'transport-error' // fetch() rejected (network, DNS, abort)
  | 'http-error' // Resend returned non-2xx
  | 'parse-error' // Resend returned non-JSON
  | 'api-rejected' // Resend returned 2xx but with id=null and error in body
  | 'aborted'; // caller cancelled via AbortSignal

export interface EmailSendSuccess {
  ok: true;
  /** Resend's message id (e.g. "abc123…"). */
  id: string;
  /** HTTP status code from Resend. */
  httpStatus: number;
  /** Number of milliseconds the call took. */
  durationMs: number;
  /** Where the message was addressed. Useful for audit logs. */
  deliveredTo: string[];
}

export interface EmailSendFailure {
  ok: false;
  reason: EmailFailureReason;
  /** HTTP status code if available. */
  httpStatus?: number;
  /** Human-readable error message. Safe to log. */
  message: string;
  /** Resend's error code (if it returned JSON). */
  apiErrorCode?: string;
  /** Number of milliseconds the call took before failing. */
  durationMs: number;
  /** Whether the caller should retry. The Resend 422 (validation) is not retryable; 5xx is. */
  retryable: boolean;
}

export type EmailSendResult = EmailSendSuccess | EmailSendFailure;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ResendConfig {
  apiKey: string;
  from: string;
  apiBase: string;
}

const DEFAULT_API_BASE = 'https://api.resend.com';

const PLACEHOLDER_KEYS = new Set([
  '',
  're_test_placeholder',
  're_xxx',
  'changeme',
  'change-me',
  'placeholder',
]);

const PLACEHOLDER_EMAILS = new Set([
  '',
  'noreply@example.com',
  'no-reply@example.com',
  'your-from@example.com',
  'placeholder@example.com',
]);

/**
 * Read Resend config from the environment. Returns null if not configured —
 * callers should treat that as "skip" and not throw, so dev / test envs
 * without email creds still work.
 */
export function loadResendConfig(): ResendConfig | null {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
  const from = (process.env.RESEND_FROM_EMAIL ?? '').trim();
  if (PLACEHOLDER_KEYS.has(apiKey.toLowerCase())) return null;
  if (PLACEHOLDER_EMAILS.has(from.toLowerCase())) return null;
  if (!apiKey) return null;
  if (!from) return null;
  // Very light validation — Resend requires an email-shaped string. We don't
  // RFC-validate here, but reject obvious garbage.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return null;
  const apiBase = (process.env.RESEND_API_BASE ?? DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  return { apiKey, from, apiBase };
}

/**
 * Is the email integration configured? Use this to gate UI labels
 * ("Watch alerts: on" vs "Watch alerts: off (no Resend key)").
 */
export function isResendConfigured(): boolean {
  return loadResendConfig() !== null;
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function normaliseAddress(input: EmailAddress | string): string {
  if (typeof input === 'string') return input;
  return input.name ? `${input.name} <${input.email}>` : input.email;
}

function normaliseAddressList(
  input: EmailAddress[] | string[] | undefined,
): string[] {
  if (!input) return [];
  return input.map(normaliseAddress);
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

/**
 * Internal: actually POST to Resend. The single seam that talks to the
 * network. Tests inject a custom `fetchImpl` to avoid hitting Resend.
 */
async function postToResend(
  cfg: ResendConfig,
  payload: Record<string, unknown>,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; id: string; httpStatus: number } | { ok: false; httpStatus?: number; bodyText: string; code?: string }> {
  const res = await fetchImpl(`${cfg.apiBase}/emails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      // Resend recommends a User-Agent; it's not required but helps their
      // request logs when we have an issue.
      'User-Agent': 'VitalFlow/1.0 (+email/resend)',
      'Idempotency-Key': (payload.headers as Record<string, string> | undefined)?.['Idempotency-Key'] ?? '',
    },
    body: JSON.stringify(payload),
    signal,
    cache: 'no-store',
  });
  // Strip the idempotency key from the headers object before posting
  // (it goes in the request header, not the JSON body).
  if (payload.headers && typeof payload.headers === 'object') {
    delete (payload.headers as Record<string, unknown>)['Idempotency-Key'];
  }

  const text = await res.text();
  let parsed: { id?: string; error?: { code?: string; message?: string } } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (res.ok && parsed?.id) {
    return { ok: true, id: parsed.id, httpStatus: res.status };
  }
  return {
    ok: false,
    httpStatus: res.status,
    bodyText: text,
    code: parsed?.error?.code,
  };
}

/** Per-call dependency injection for the HTTP client. Defaults to global fetch. */
export type FetchImpl = typeof fetch;

export interface SendEmailOptions {
  /** AbortSignal for the underlying fetch. */
  signal?: AbortSignal;
  /** Injected fetch — tests use this to intercept the HTTP call. */
  fetchImpl?: FetchImpl;
  /**
   * Override the configured `from` for this one call. Useful for the
   * `no-reply@vitalflow.haybee.xyz` sender when we want a different replyTo.
   */
  fromOverride?: string;
}

/**
 * Send a single email via Resend.
 *
 * Never throws on delivery failure — returns an `EmailSendFailure` so the
 * caller can record exactly what happened. Throws only on programmer
 * errors (a mis-constructed EmailMessage that slipped past validation).
 */
export async function sendEmail(
  message: EmailMessage,
  options: SendEmailOptions = {},
): Promise<EmailSendResult> {
  const start = Date.now();
  const cfg = loadResendConfig();
  const fromAddress = options.fromOverride ?? (typeof message.from === 'string' ? message.from : message.from?.email) ?? cfg?.from;

  // ---- Pre-flight validation ----
  const to = normaliseAddressList(message.to);
  if (to.length === 0) {
    return {
      ok: false,
      reason: 'no-recipient',
      message: 'sendEmail called with no recipients.',
      durationMs: Date.now() - start,
      retryable: false,
    };
  }
  if (!message.text && !message.html) {
    return {
      ok: false,
      reason: 'no-body',
      message: 'sendEmail called with neither text nor html body.',
      durationMs: Date.now() - start,
      retryable: false,
    };
  }
  if (!cfg || !fromAddress) {
    return {
      ok: false,
      reason: !cfg ? 'not-configured' : 'invalid-config',
      message: !cfg
        ? 'RESEND_API_KEY and/or RESEND_FROM_EMAIL are not configured.'
        : 'From address is missing or invalid.',
      durationMs: Date.now() - start,
      retryable: false,
    };
  }

  // ---- Build Resend payload ----
  // Resend's schema: https://resend.com/docs/api-reference/emails/send-email
  const idempotencyKey = `vf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload: Record<string, unknown> = {
    from: fromAddress,
    to,
    subject: message.subject,
    ...(message.text ? { text: message.text } : {}),
    ...(message.html ? { html: message.html } : {}),
    ...(message.cc ? { cc: normaliseAddressList(message.cc) } : {}),
    ...(message.bcc ? { bcc: normaliseAddressList(message.bcc) } : {}),
    ...(message.replyTo ? { reply_to: normaliseAddressList(message.replyTo) } : {}),
    ...(message.tags && message.tags.length > 0 ? { tags: message.tags } : {}),
    ...(message.scheduledAt ? { scheduled_at: message.scheduledAt } : {}),
    ...(message.headers ? { headers: message.headers } : {}),
    // Resend's idempotency key lives in a request header, not the body,
    // but we pass it through `message.headers` so the post function can
    // attach it. We add it now.
    headers: {
      ...(message.headers ?? {}),
      'Idempotency-Key': idempotencyKey,
    },
  };

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const result = await postToResend(cfg, payload, options.signal, fetchImpl);
    const durationMs = Date.now() - start;
    if (result.ok) {
      return {
        ok: true,
        id: result.id,
        httpStatus: result.httpStatus,
        durationMs,
        deliveredTo: to,
      };
    }
    const httpStatus = result.httpStatus;
    const retryable = httpStatus === undefined
      ? true
      : httpStatus >= 500 || httpStatus === 408 || httpStatus === 429;
    return {
      ok: false,
      reason: httpStatus === undefined ? 'transport-error' : 'http-error',
      httpStatus,
      message: result.bodyText || `Resend returned HTTP ${httpStatus ?? 'unknown'}`,
      apiErrorCode: result.code,
      durationMs,
      retryable,
    };
  } catch (e) {
    const durationMs = Date.now() - start;
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        ok: false,
        reason: 'aborted',
        message: 'sendEmail aborted by caller.',
        durationMs,
        retryable: false,
      };
    }
    return {
      ok: false,
      reason: 'transport-error',
      message: e instanceof Error ? e.message : 'Unknown network error contacting Resend.',
      durationMs,
      retryable: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Watcher alert — the specific call site for the orchestrator
// ---------------------------------------------------------------------------

export interface WatcherAlertInput {
  /** Where to send. We don't validate the email format here; the caller does. */
  to: string;
  /** Business name shown in the email. */
  businessName: string;
  /** One WatchEvent row. */
  event: {
    id: string;
    eventType: string;
    summary: string;
    evidence: Record<string, unknown>;
    createdAt: Date;
  };
  /** All events detected in the same Watcher run. Used in the "more changes" footer. */
  siblingEvents: Array<{ eventType: string; summary: string }>;
  /** Latest analysis — for the score/band header. */
  analysis: {
    score: number;
    band: string;
    periodEnd: string | null;
    periodStart: string | null;
    monthsAnalyzed: number;
    currency: string;
  };
  /** Where the business owner lands when they click "View in VitalFlow". */
  dashboardUrl: string;
  /** UTC timestamp used in headers / footer. */
  now?: Date;
}

export interface WatcherAlertRendered {
  subject: string;
  text: string;
  html: string;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  score_drop: 'Score dropped',
  score_rise: 'Score improved',
  threshold_crossed: 'Threshold crossed',
  balance_anomaly: 'Unusual balance movement',
  recurring_broken: 'A recurring payment was missed',
  risk_flag_new: 'New risk flag',
  funding_tier_change: 'Funding readiness changed',
};

function eventLabel(type: string): string {
  return EVENT_TYPE_LABEL[type] ?? humaniseEventType(type);
}

function humaniseEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Render the email body (text + html) for a watcher alert. */
export function renderWatcherAlert(input: WatcherAlertInput): WatcherAlertRendered {
  const label = eventLabel(input.event.eventType);
  const business = input.businessName.trim() || 'Your business';
  const now = input.now ?? new Date();
  const dateLine = now.toUTCString();
  const score = input.analysis.score.toFixed(1);
  const band = input.analysis.band;
  const subject = `VitalFlow · ${label} — ${business} (score ${score}, ${band})`;

  const siblingLines =
    input.siblingEvents.length > 1
      ? input.siblingEvents
          .filter((s) => s.summary !== input.event.summary || true) // keep all
          .slice(0, 4)
          .map((s) => `  · ${eventLabel(s.eventType)}: ${s.summary}`)
          .join('\n')
      : '';

  const periodLine =
    input.analysis.periodStart && input.analysis.periodEnd
      ? `Statement period: ${input.analysis.periodStart.slice(0, 10)} → ${input.analysis.periodEnd.slice(0, 10)} (${input.analysis.monthsAnalyzed} months, ${input.analysis.currency})`
      : `Months analysed: ${input.analysis.monthsAnalyzed} (${input.analysis.currency})`;

  // Plain text
  const text = [
    `Hi ${business} team,`,
    ``,
    `VitalFlow noticed something worth your attention on ${dateLine}.`,
    ``,
    `What changed: ${label}`,
    input.event.summary,
    ``,
    `Your current score: ${score} / 100 (${band}).`,
    periodLine,
    siblingLines ? `\nOther changes in the same run:\n${siblingLines}\n` : '',
    `Open the dashboard to see the full breakdown:`,
    input.dashboardUrl,
    ``,
    `This message was sent because the Watcher detected a material change in the most recent financial analysis. It's part of VitalFlow's semi-autonomous agent loop — you stay in control.`,
    ``,
    `— VitalFlow`,
    `Caribbean MSME Financial Health & Funding Infrastructure`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  // HTML
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F7F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F9FC;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E6EAF0;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#1268E8;color:#FFFFFF;padding:20px 24px;">
            <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">VitalFlow · Watcher alert</div>
            <div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(label)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px 0;font-size:14px;color:#667085;">${escapeHtml(dateLine)}</p>
            <p style="margin:0 0 8px 0;font-size:14px;color:#98A2B3;text-transform:uppercase;letter-spacing:0.08em;">What changed</p>
            <p style="margin:0 0 20px 0;font-size:15px;line-height:22px;color:#111827;">${escapeHtml(input.event.summary)}</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F9FC;border:1px solid #E6EAF0;border-radius:10px;margin-bottom:20px;">
              <tr>
                <td style="padding:16px;">
                  <div style="font-size:12px;color:#98A2B3;text-transform:uppercase;letter-spacing:0.08em;">Current score</div>
                  <div style="font-size:24px;font-weight:700;color:#111827;margin-top:2px;">${escapeHtml(score)} / 100 <span style="font-size:14px;color:#12B76A;margin-left:6px;">${escapeHtml(band)}</span></div>
                  <div style="font-size:12px;color:#667085;margin-top:6px;">${escapeHtml(periodLine)}</div>
                </td>
              </tr>
            </table>
            ${
              input.siblingEvents.length > 1
                ? `<p style="margin:0 0 6px 0;font-size:12px;color:#98A2B3;text-transform:uppercase;letter-spacing:0.08em;">Other changes this run</p>
            <ul style="margin:0 0 20px 18px;padding:0;font-size:14px;color:#111827;line-height:22px;">
              ${input.siblingEvents
                .slice(0, 4)
                .map(
                  (s) =>
                    `<li><strong>${escapeHtml(eventLabel(s.eventType))}:</strong> ${escapeHtml(s.summary)}</li>`,
                )
                .join('')}
            </ul>`
                : ''
            }

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:8px 0 0 0;">
                  <a href="${escapeAttr(input.dashboardUrl)}" style="display:inline-block;background:#1268E8;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">View in VitalFlow</a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0 0;font-size:12px;line-height:18px;color:#98A2B3;">
              You received this because VitalFlow's Watcher detected a material change in your latest financial analysis. The semi-autonomous agent loop sends alerts only for changes that cross a defined threshold.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0;font-size:12px;color:#98A2B3;">VitalFlow · Caribbean MSME Financial Health &amp; Funding Infrastructure</p>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Build and send a Watcher alert email. Convenience wrapper.
 *
 * Returns the full EmailSendResult so the caller (orchestrator) can
 * persist `notifiedAt` only on success.
 */
export async function sendWatcherAlert(
  input: WatcherAlertInput,
  options: SendEmailOptions = {},
): Promise<EmailSendResult> {
  const rendered = renderWatcherAlert(input);
  return sendEmail(
    {
      to: [{ email: input.to }],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      tags: [
        { name: 'category', value: 'watcher-alert' },
        { name: 'event', value: input.event.eventType },
        { name: 'business', value: input.businessName.slice(0, 50) },
      ],
    },
    options,
  );
}

// ---------------------------------------------------------------------------
// Tiny HTML escaper (avoids adding a dep just for this)
// ---------------------------------------------------------------------------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}
