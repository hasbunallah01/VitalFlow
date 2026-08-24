/**
 * GET /api/audit
 *
 * Returns the org's agent audit trail. Every agent invocation writes
 * one AgentRun row; every detected Watcher event becomes a WatchEvent
 * row; every Recommendation becomes a Recommendation row; every
 * Funding Outreach draft becomes a FundingOutreach row.
 *
 * Query params:
 *   ?type=agent_runs|watch_events|recommendations|funding_outreach|all
 *     (default: all)
 *   ?limit=N (default 50, max 200)
 *
 * This is what the audit-trail tab in the UI calls. No mock data —
 * every row comes from real DB state produced by the orchestrator.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 200;

export async function GET(req: Request) {
  const session = await getOrCreateDevSession();
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') ?? 'all').toLowerCase();
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50),
  );

  const orgId = session.organizationId;

  const result: Record<string, unknown> = {};

  // We always include agent_runs because it's the spine of the audit
  // trail. Other types are included based on the ?type filter.
  if (type === 'all' || type === 'agent_runs') {
    const agentRuns = await prisma.agentRun.findMany({
      where: { analysis: { organizationId: orgId } },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { analysis: { select: { id: true, score: true, band: true } } },
    });
    result.agentRuns = agentRuns.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      analysisScore: r.analysis.score,
      analysisBand: r.analysis.band,
      agent: r.agent,
      agentVersion: r.agentVersion,
      model: r.model,
      promptId: r.promptId,
      inputHash: r.inputHash,
      status: r.status,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      durationMs: r.durationMs,
      warnings: r.warnings,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
    }));
  }

  if (type === 'all' || type === 'watch_events') {
    const watchEvents = await prisma.watchEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    result.watchEvents = watchEvents.map((w) => ({
      id: w.id,
      analysisId: w.analysisId,
      eventType: w.eventType,
      summary: w.summary,
      evidence: w.evidence,
      notifiedAt: w.notifiedAt,
      notificationChannel: w.notificationChannel,
      createdAt: w.createdAt,
    }));
  }

  if (type === 'all' || type === 'recommendations') {
    const recommendations = await prisma.recommendation.findMany({
      where: { analysis: { organizationId: orgId } },
      orderBy: [{ priority: 'asc' }, { displayOrder: 'asc' }],
      take: limit,
    });
    result.recommendations = recommendations.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      action: r.action,
      rationale: r.rationale,
      priority: r.priority,
      effort: r.effort,
      pillar: r.pillar,
      estimatedPointGain: r.estimatedPointGain,
      timeframe: r.timeframe,
    }));
  }

  if (type === 'all' || type === 'funding_outreach') {
    const funding = await prisma.fundingOutreach.findMany({
      where: { organizationId: orgId },
      orderBy: { draftedAt: 'desc' },
      take: limit,
    });
    // ShareLink is a manual lookup — the Prisma model has shareLinkId
    // (a string FK) but no relation declared, so we resolve it here.
    const shareLinkIds = funding.map((f) => f.shareLinkId).filter((s): s is string => !!s);
    const shareLinks = shareLinkIds.length > 0
      ? await prisma.shareLink.findMany({ where: { id: { in: shareLinkIds } } })
      : [];
    const shareLinkById = new Map(shareLinks.map((s) => [s.id, s]));

    result.fundingOutreach = funding.map((f) => {
      const eligible = f.eligiblePrograms as Array<{ programId: string; programName: string; eligible: boolean }>;
      const plan = f.plan as { headline?: string; summary?: string; recommendedProgram?: string | null };
      const evidence = f.evidencePack as { readinessGap?: Array<{ programId: string; totalPointsShort: number; status: string }> };
      const sl = f.shareLinkId ? shareLinkById.get(f.shareLinkId) : null;
      return {
        id: f.id,
        analysisId: f.analysisId,
        status: f.status,
        eligibleCount: eligible.filter((p) => p.eligible).length,
        almostCount: eligible.filter((p) => !p.eligible).length,
        programNames: eligible.map((p) => p.programName),
        planHeadline: plan.headline ?? null,
        planSummary: plan.summary ?? null,
        recommendedProgram: plan.recommendedProgram ?? null,
        readinessGap: evidence.readinessGap ?? null,
        viewCount: f.viewCount,
        firstViewedAt: f.firstViewedAt,
        lastViewedAt: f.lastViewedAt,
        approvedAt: f.approvedAt,
        draftedByModel: f.draftedByModel,
        draftedAt: f.draftedAt,
        shareLink: sl
          ? {
              token: sl.token,
              expiresAt: sl.expiresAt,
              accessCount: sl.accessCount,
              revokedAt: sl.revokedAt,
            }
          : null,
      };
    });
  }

  if (type === 'all' || type === 'analyses') {
    const analyses = await prisma.analysis.findMany({
      where: { organizationId: orgId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: { statement: { select: { filename: true, periodStart: true, periodEnd: true } } },
    });
    result.analyses = analyses.map((a) => ({
      id: a.id,
      score: a.score,
      band: a.band,
      filename: a.statement.filename,
      periodStart: a.statement.periodStart,
      periodEnd: a.statement.periodEnd,
      completedAt: a.completedAt,
    }));
  }

  return NextResponse.json(result);
}
