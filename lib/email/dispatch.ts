/**
 * VitalFlow — Watcher alert dispatch.
 *
 * Glue between the orchestrator and lib/email/resend.ts. Owns:
 *   - Recipient lookup (org owner via Membership)
 *   - Fake-email detection (skip @*.example / @test.example / etc.)
 *   - Setting `notifiedAt` + `notificationChannel` only on real Resend success
 *   - Recording failure on the AgentRun output so the audit trail is honest
 *
 * Kept separate from resend.ts so:
 *   - resend.ts stays pure HTTP + rendering (no DB)
 *   - the dispatch can be tested with a fake Resend client
 *   - the orchestrator has one import to reason about
 */

import 'server-only';
import type { PrismaClient } from '@prisma/client';
import {
  isResendConfigured,
  sendWatcherAlert,
  type EmailSendResult,
} from './resend';

type Db = PrismaClient;

/** A created WatchEvent row, as returned by Prisma's `create`. */
export interface CreatedWatchEvent {
  id: string;
  organizationId: string;
  analysisId: string | null;
  eventType: string;
  summary: string;
  evidence: unknown;
  createdAt: Date;
  notifiedAt: Date | null;
  notificationChannel: string | null;
}

export interface DispatchInput {
  db: Db;
  /** The org's business name (for the email greeting). */
  businessName: string;
  /** All WatchEvents just created by this orchestrator run. */
  events: CreatedWatchEvent[];
  /** Latest analysis — for the email header. */
  analysis: {
    id: string;
    score: number;
    band: string;
    currency: string;
    monthsAnalyzed: number;
    periodStart: string | null;
    periodEnd: string | null;
  };
  /** Override dashboard URL — for tests. */
  dashboardUrlOverride?: string;
  /** Hard timeout for the whole dispatch in ms. Default 5000. */
  timeoutMs?: number;
  /**
   * Optional injected sender — only used in tests. Defaults to
   * `sendWatcherAlert` from resend.ts.
   */
  sendImpl?: (input: Parameters<typeof sendWatcherAlert>[0]) => Promise<EmailSendResult>;
}

export interface DispatchResult {
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    watchEventId: string;
    outcome: 'sent' | 'skipped' | 'failed';
    reason?: string;
    resendId?: string;
    httpStatus?: number;
    apiErrorCode?: string;
  }>;
}

/**
 * TLDs that look like an email but won't accept mail. We refuse to call
 * Resend for these so the production audit trail doesn't show
 * 'sent:true' for emails that go nowhere.
 */
const FAKE_EMAIL_TLDS = ['.example', '.test', '.invalid', '.localhost'];

function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  return !FAKE_EMAIL_TLDS.some((tld) => lower.endsWith(tld));
}

function getEnvDashboardUrl(): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (env) return env.replace(/\/+$/, '');
  // Sensible default that lets the link be useful in dev / preview.
  return 'https://vitalflow.haybee.xyz';
}

/**
 * Look up the org owner's email. Returns null if there's no real email.
 *
 * Owner = the first Membership row for the org with role='owner' (and
 * a user with a real-shaped email). We use the first non-empty
 * deliverable email we find.
 */
async function findOwnerEmail(
  db: Db,
  organizationId: string,
): Promise<{ email: string; name: string | null } | null> {
  const memberships = await db.membership.findMany({
    where: { organizationId, role: 'owner' },
    include: { user: { select: { email: true, name: true } } },
    take: 5,
  });
  for (const m of memberships) {
    if (isDeliverableEmail(m.user.email)) {
      return { email: m.user.email, name: m.user.name ?? null };
    }
  }
  // Fall back to any membership with a real email (not necessarily owner).
  const anyMemberships = await db.membership.findMany({
    where: { organizationId },
    include: { user: { select: { email: true, name: true } } },
    take: 5,
  });
  for (const m of anyMemberships) {
    if (isDeliverableEmail(m.user.email)) {
      return { email: m.user.email, name: m.user.name ?? null };
    }
  }
  return null;
}

/**
 * Send Watcher alert emails for the given events.
 *
 * Contract:
 *   - Zero events → zero emails, returns immediately.
 *   - One event → one email.
 *   - Multiple events → ONE consolidated email (the first event is the
 *     "primary"; the rest appear in the body as "Other changes this run").
 *     This is the right UX (no inbox spam) and prevents the
 *     'sent the same event twice' concern by construction.
 *   - On real Resend success → set notifiedAt + notificationChannel='email'
 *     for ALL events in the input.
 *   - On Resend failure → notifiedAt stays null; the failure is captured
 *     in the returned DispatchResult so the orchestrator can log it.
 *   - On no recipient / Resend not configured → return early with
 *     'skipped' for each event; the audit trail still shows the events
 *     as observed.
 */
export async function dispatchWatcherAlerts(
  input: DispatchInput,
): Promise<DispatchResult> {
  const details: DispatchResult['details'] = [];
  if (input.events.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, details };
  }

  // ---- Recipient lookup ----
  const owner = await findOwnerEmail(input.db, input.events[0]!.organizationId);

  if (!owner) {
    // No real email on file. Mark all events as skipped so the audit
    // trail is honest.
    for (const ev of input.events) {
      details.push({
        watchEventId: ev.id,
        outcome: 'skipped',
        reason: 'no-real-recipient',
      });
    }
    return { attempted: input.events.length, sent: 0, skipped: input.events.length, failed: 0, details };
  }

  if (!isResendConfigured()) {
    for (const ev of input.events) {
      details.push({
        watchEventId: ev.id,
        outcome: 'skipped',
        reason: 'resend-not-configured',
      });
    }
    return { attempted: input.events.length, sent: 0, skipped: input.events.length, failed: 0, details };
  }

  // ---- Build the email payload ----
  const primary = input.events[0]!;
  const siblings = input.events.map((e) => ({
    eventType: e.eventType,
    summary: e.summary,
  }));
  const dashboardUrl = (input.dashboardUrlOverride ?? getEnvDashboardUrl()) + `/analysis/${input.analysis.id}`;

  const sendImpl = input.sendImpl ?? sendWatcherAlert;
  const timeoutMs = input.timeoutMs ?? 5000;

  // Wrap the send in a timeout — we don't want a slow Resend to push
  // the upload past Vercel's 60s budget.
  const sendPromise = sendImpl({
    to: owner.email,
    businessName: input.businessName,
    event: {
      id: primary.id,
      eventType: primary.eventType,
      summary: primary.summary,
      evidence: (primary.evidence ?? {}) as Record<string, unknown>,
      createdAt: primary.createdAt,
    },
    siblingEvents: siblings,
    analysis: input.analysis,
    dashboardUrl,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<EmailSendResult>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          ok: false,
          reason: 'aborted',
          message: `dispatchWatcherAlerts timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs,
          retryable: true,
        }),
      timeoutMs,
    );
  });

  let result: EmailSendResult;
  try {
    result = await Promise.race([sendPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  // ---- Persist the outcome ----
  if (result.ok) {
    // Mark ALL events as notified. This is the "you were told about
    // this orchestrator run" marker, not the per-event marker.
    await input.db.watchEvent.updateMany({
      where: { id: { in: input.events.map((e) => e.id) } },
      data: {
        notifiedAt: new Date(),
        notificationChannel: 'email',
      },
    });
    for (const ev of input.events) {
      details.push({
        watchEventId: ev.id,
        outcome: 'sent',
        resendId: result.id,
        httpStatus: result.httpStatus,
      });
    }
    return {
      attempted: input.events.length,
      sent: input.events.length,
      skipped: 0,
      failed: 0,
      details,
    };
  }

  // Failure — leave notifiedAt as null, record the failure detail.
  for (const ev of input.events) {
    details.push({
      watchEventId: ev.id,
      outcome: 'failed',
      reason: result.reason,
      httpStatus: result.httpStatus,
      apiErrorCode: result.apiErrorCode,
    });
  }
  return {
    attempted: input.events.length,
    sent: 0,
    skipped: 0,
    failed: input.events.length,
    details,
  };
}

// Exported for tests
export { findOwnerEmail, isDeliverableEmail };
