/**
 * GET /api/funding-outreach
 *
 * Returns the org's funding outreach drafts (newest first). This is
 * what the Funding page and the funding detail page call. Each item
 * carries the same shape as the audit endpoint's `funding_outreach`
 * key, plus the `eligiblePrograms` array and the full `plan` object
 * so the detail page can render without a second round-trip.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getOrCreateDevSession();
  const rows = await prisma.fundingOutreach.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { draftedAt: 'desc' },
    take: 20,
  });

  // Resolve share links in one query (the Prisma model has the FK as a
  // string, not a relation, so we join manually).
  const shareLinkIds = rows.map((r) => r.shareLinkId).filter((s): s is string => !!s);
  const shareLinks = shareLinkIds.length
    ? await prisma.shareLink.findMany({ where: { id: { in: shareLinkIds } } })
    : [];
  const shareLinkById = new Map(shareLinks.map((s) => [s.id, s]));

  return NextResponse.json({
    fundingOutreach: rows.map((r) => shape(r, shareLinkById.get(r.shareLinkId ?? ''))),
  });
}

function shape(
  r: {
    id: string;
    analysisId: string;
    status: string;
    eligiblePrograms: unknown;
    plan: unknown;
    evidencePack: unknown;
    viewCount: number;
    firstViewedAt: Date | null;
    lastViewedAt: Date | null;
    approvedAt: Date | null;
    draftedByModel: string | null;
    draftedAt: Date;
    shareLinkId: string | null;
  },
  sl: { token: string; expiresAt: Date; accessCount: number; revokedAt: Date | null } | undefined,
) {
  const eligible = (r.eligiblePrograms as Array<{
    programId: string;
    programName: string;
    eligible: boolean;
  }>) ?? [];
  const plan = (r.plan as { headline?: string; summary?: string; recommendedProgram?: string | null }) ?? {};
  const evidence = (r.evidencePack as { readinessGap?: unknown }) ?? {};
  return {
    id: r.id,
    analysisId: r.analysisId,
    status: r.status,
    eligibleCount: eligible.filter((p) => p.eligible).length,
    almostCount: eligible.filter((p) => !p.eligible).length,
    programNames: eligible.map((p) => p.programName),
    planHeadline: plan.headline ?? null,
    planSummary: plan.summary ?? null,
    recommendedProgram: plan.recommendedProgram ?? null,
    readinessGap: evidence.readinessGap ?? null,
    viewCount: r.viewCount,
    firstViewedAt: r.firstViewedAt,
    lastViewedAt: r.lastViewedAt,
    approvedAt: r.approvedAt,
    draftedByModel: r.draftedByModel,
    draftedAt: r.draftedAt,
    shareLink: sl
      ? {
          token: sl.token,
          expiresAt: sl.expiresAt,
          accessCount: sl.accessCount,
          revokedAt: sl.revokedAt,
        }
      : null,
  };
}
