/**
 * Funding Outreach persistence + Approver state machine.
 *
 * The state machine is the heart of the Approver pattern from
 * docs/AGENTS.md. Consequential actions (sharing with a lender)
 * require an explicit human gate. This module enforces the transitions
 * and writes the FundingOutreach + ShareLink rows.
 *
 * State machine:
 *
 *   drafted ─→ approved ─→ shared ─→ viewed ─→ completed
 *      │           │          │
 *      └→ revoked  └→ revoked └→ revoked
 *      └→ failed   └→ failed  └→ failed
 *
 * 'approved' is the only transition that requires a human gate.
 * 'shared' requires 'approved' AND creates a ShareLink.
 * 'viewed' is fired by the webhook when a lender opens the link.
 * 'completed' is fired after a successful lender review.
 */

import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import type { FundingOutreachDraft, ProgramSummary } from '../../agents/funding-outreach';

type Db = PrismaClient;

const SHARE_LINK_TTL_DAYS = 14;

/** Map our lowercase band to the Prisma enum. */
function bandToPrisma(band: string): 'Strong' | 'Healthy' | 'Watch' | 'Fragile' | 'Critical' {
  const map: Record<string, 'Strong' | 'Healthy' | 'Watch' | 'Fragile' | 'Critical'> = {
    strong: 'Strong',
    healthy: 'Healthy',
    watch: 'Watch',
    fragile: 'Fragile',
    critical: 'Critical',
  };
  return map[band] ?? 'Watch';
}

/** Random URL-safe token for a share link. */
function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export interface CreateFundingOutreachInput {
  organizationId: string;
  analysisId: string;
  draft: FundingOutreachDraft;
  /** The eligibility list with rule-missed, persisted as JSON. */
  eligiblePrograms: Array<{
    programId: string;
    programName: string;
    institution: string;
    eligible: boolean;
    ruleMissed: string[];
  }>;
  /** The LLM-drafted plan, persisted as JSON. */
  plan: { headline: string; summary: string; recommendedProgram: string | null; nextSteps: string[] };
  /** Evidence pack draft (same data the lender-facing API would serve). */
  evidencePack: Record<string, unknown>;
  /** LLM model + version. */
  draftedByModel?: string;
}

/** Persist a freshly-drafted FundingOutreach (status='drafted'). */
export async function createFundingOutreach(
  db: Db,
  input: CreateFundingOutreachInput,
) {
  return db.fundingOutreach.create({
    data: {
      organizationId: input.organizationId,
      analysisId: input.analysisId,
      status: 'drafted',
      eligiblePrograms: input.eligiblePrograms as unknown as object,
      plan: input.plan as unknown as object,
      evidencePack: input.evidencePack as unknown as object,
      draftedByModel: input.draftedByModel,
    },
  });
}

export interface ApproveFundingOutreachInput {
  outreachId: string;
  approverUserId: string;
  /** Optional: scope the share to specific lender org ids. */
  visibleToLenderOrgIds?: string[];
}

/**
 * Approve a drafted outreach. The human-in-the-loop gate.
 * Transitions drafted → approved.
 */
export async function approveFundingOutreach(
  db: Db,
  input: ApproveFundingOutreachInput,
) {
  const current = await db.fundingOutreach.findUnique({ where: { id: input.outreachId } });
  if (!current) throw new Error(`FundingOutreach ${input.outreachId} not found`);
  if (current.status !== 'drafted') {
    throw new Error(`Cannot approve: status is "${current.status}", expected "drafted"`);
  }
  return db.fundingOutreach.update({
    where: { id: input.outreachId },
    data: {
      status: 'approved',
      approvedAt: new Date(),
      approvedByUserId: input.approverUserId,
    },
  });
}

/**
 * Revoke a funding outreach at any state.
 * Stops the share link from being usable.
 */
export async function revokeFundingOutreach(db: Db, outreachId: string) {
  const current = await db.fundingOutreach.findUnique({ where: { id: outreachId } });
  if (!current) throw new Error(`FundingOutreach ${outreachId} not found`);
  // Revoke the share link if one exists
  if (current.shareLinkId) {
    await db.shareLink.update({
      where: { id: current.shareLinkId },
      data: { revokedAt: new Date() },
    });
  }
  return db.fundingOutreach.update({
    where: { id: outreachId },
    data: { status: 'revoked' },
  });
}

export interface ShareFundingOutreachInput {
  outreachId: string;
  /** Optional: override the default 14-day TTL (days). */
  ttlDays?: number;
}

/**
 * Share the approved outreach with lenders.
 * Transitions approved → shared and creates a ShareLink with a token.
 * The token is the only thing lenders need to see the evidence pack.
 *
 * Implementation note: ShareLink.reportId references the Report model,
 * not the FundingOutreach model. So we first create a Report row that
 * "is" the funding evidence pack, then create the ShareLink pointing
 * at that Report. The Report's model JSON contains the same evidence
 * pack content as the FundingOutreach.evidencePack column.
 */
export async function shareFundingOutreach(db: Db, input: ShareFundingOutreachInput) {
  const current = await db.fundingOutreach.findUnique({ where: { id: input.outreachId } });
  if (!current) throw new Error(`FundingOutreach ${input.outreachId} not found`);
  if (current.status !== 'approved') {
    throw new Error(`Cannot share: status is "${current.status}", expected "approved"`);
  }
  const token = generateShareToken();
  const ttl = input.ttlDays ?? SHARE_LINK_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);
  // 1. Create the Report (which the ShareLink will point to)
  const report = await db.report.create({
    data: {
      analysisId: current.analysisId,
      pdfRef: `funding/${current.id}/evidence-pack.pdf`,
      model: (current.evidencePack ?? {}) as unknown as object,
      pages: 1, // single-page evidence pack for the MVP
      disclaimerVersion: '1.0.0',
    },
  });
  // 2. Create the ShareLink
  const shareLink = await db.shareLink.create({
    data: {
      reportId: report.id,
      token,
      expiresAt,
    },
  });
  // 3. Link the shareLinkId back to the outreach
  return db.fundingOutreach.update({
    where: { id: input.outreachId },
    data: {
      status: 'shared',
      shareLinkId: shareLink.id,
    },
  });
}

/**
 * Webhook: lender opened the share link. Increments view count.
 * Transitions shared → viewed on first view.
 */
export async function lenderViewedShareLink(db: Db, token: string) {
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link) throw new Error(`ShareLink with token ${token} not found`);
  if (link.revokedAt) throw new Error('ShareLink has been revoked');
  if (link.expiresAt < new Date()) throw new Error('ShareLink has expired');
  await db.shareLink.update({
    where: { id: link.id },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });
  // Find the outreach and transition shared → viewed (first time only)
  const outreach = await db.fundingOutreach.findFirst({ where: { shareLinkId: link.id } });
  if (outreach && outreach.status === 'shared') {
    const updated = await db.fundingOutreach.update({
      where: { id: outreach.id },
      data: {
        status: 'viewed',
        firstViewedAt: outreach.firstViewedAt ?? new Date(),
        lastViewedAt: new Date(),
        viewCount: { increment: 1 },
      },
    });
    return { link, outreach: updated, justTransitioned: true };
  }
  if (outreach) {
    // Subsequent views: bump viewCount and update lastViewedAt, but
    // don't transition state again.
    const updated = await db.fundingOutreach.update({
      where: { id: outreach.id },
      data: {
        lastViewedAt: new Date(),
        viewCount: { increment: 1 },
      },
    });
    return { link, outreach: updated, justTransitioned: false };
  }
  return { link, outreach: null, justTransitioned: false };
}

/**
 * Mark the outreach as completed after a successful lender review.
 * Transitions viewed → completed.
 */
export async function completeFundingOutreach(db: Db, outreachId: string) {
  return db.fundingOutreach.update({
    where: { id: outreachId },
    data: { status: 'completed' },
  });
}

/**
 * Build the evidence pack that the lender-facing API will serve.
 * Pure function: same input → same output. The lender sees this
 * exactly as we computed it. The agent's numbers are the lender's
 * numbers — no AI invented anything.
 */
export interface BuildEvidencePackInput {
  organizationId: string;
  analysisId: string;
  assessment: {
    score: number;
    band: string;
    pillars: Array<{ id: string; label: string; maxPoints: number; points: number; metrics: Array<{ id: string; label: string; value: number; contribution: number; explanation?: string }> }>;
    anomalies: { returnedPayments: number; overdraftDays: number; structuralBreaks: number; rapidDeteriorationDetected: boolean; details: Array<{ kind: string; description: string; date?: string }> };
    monthly: Array<{ yearMonth: string; netFlow: { amountMinor: bigint; currency: string }; inflow: { amountMinor: bigint; currency: string }; outflow: { amountMinor: bigint; currency: string }; balanceEnd?: { amountMinor: bigint; currency: string } }>;
    periodStart: string;
    periodEnd: string;
  };
  profile: { country: string; sector: string; monthsInOperation: number; annualRevenue: { amount: number; currency: string } };
  draft: FundingOutreachDraft;
  generatedAt: string;
}

export function buildEvidencePack(input: BuildEvidencePackInput): Record<string, unknown> {
  return {
    generatedAt: input.generatedAt,
    organization: {
      id: input.organizationId,
      profile: input.profile,
    },
    analysis: {
      id: input.analysisId,
      score: input.assessment.score,
      band: input.assessment.band,
      period: { start: input.assessment.periodStart, end: input.assessment.periodEnd },
      pillars: input.assessment.pillars.map((p) => ({
        id: p.id,
        label: p.label,
        points: p.points,
        maxPoints: p.maxPoints,
        metrics: p.metrics.map((m) => ({
          id: m.id,
          label: m.label,
          value: m.value,
          contribution: m.contribution,
          explanation: m.explanation,
        })),
      })),
      anomalies: input.assessment.anomalies,
      monthly: input.assessment.monthly.map((m) => ({
        yearMonth: m.yearMonth,
        inflow: Number(m.inflow.amountMinor) / 100,
        outflow: Number(-m.outflow.amountMinor) / 100,
        netFlow: Number(m.netFlow.amountMinor) / 100,
        balanceEnd: m.balanceEnd ? Number(m.balanceEnd.amountMinor) / 100 : null,
      })),
    },
    funding: {
      recommendedProgram: input.draft.recommendedProgramId,
      planSummary: input.draft.planSummary,
      eligible: input.draft.eligible,
      almost: input.draft.almost,
    },
  };
}
