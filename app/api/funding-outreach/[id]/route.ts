/**
 * GET /api/funding-outreach/[id]
 *
 * Returns the full detail of a single funding outreach — the plan, the
 * eligible programs list, the evidence pack. Used by the detail page.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getOrCreateDevSession();
  const r = await prisma.fundingOutreach.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let shareLink = null;
  if (r.shareLinkId) {
    const sl = await prisma.shareLink.findUnique({ where: { id: r.shareLinkId } });
    if (sl) {
      shareLink = {
        token: sl.token,
        expiresAt: sl.expiresAt,
        accessCount: sl.accessCount,
        revokedAt: sl.revokedAt,
      };
    }
  }

  const eligible = (r.eligiblePrograms as Array<{
    programId: string;
    programName: string;
    institution: string;
    eligible: boolean;
    ruleMissed: string[];
  }>) ?? [];
  const plan = (r.plan as { headline?: string; summary?: string; recommendedProgram?: string | null; nextSteps?: string[] }) ?? {};
  const evidence = (r.evidencePack as { readinessGap?: unknown }) ?? {};

  return NextResponse.json({
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
    shareLink,
    eligiblePrograms: eligible,
    plan,
    evidencePack: r.evidencePack,
  });
}
