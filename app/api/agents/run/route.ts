/**
 * POST /api/agents/run
 *
 * Manually re-run the orchestrator on the org's latest completed
 * analysis. The orchestrator is idempotent at the row level — calling
 * it again creates a new AgentRun per agent and (for Watcher) new
 * WatchEvent rows.
 *
 * Body (JSON, all optional):
 *   { "agents": ["watcher", "insight", "funding-outreach"] }
 *
 * Defaults to running all three.
 */

import { NextResponse } from 'next/server';
import { runAgentsForAnalysis, type AgentName } from '@/lib/orchestrator';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_AGENTS: ReadonlyArray<AgentName> = ['watcher', 'insight', 'funding-outreach'];

export async function POST(req: Request) {
  const session = await getOrCreateDevSession();
  // Find the latest completed analysis for the org.
  const latest = await prisma.analysis.findFirst({
    where: { organizationId: session.organizationId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
    select: { id: true },
  });
  if (!latest) {
    return NextResponse.json(
      { error: 'No completed analysis yet. Upload a CSV first.' },
      { status: 404 },
    );
  }

  // Parse optional body for agent filter.
  let agents: ReadonlyArray<AgentName> | undefined;
  try {
    const body = await req.json();
    if (body && Array.isArray(body.agents)) {
      const requested = body.agents.filter((a: unknown): a is AgentName =>
        typeof a === 'string' && (VALID_AGENTS as ReadonlyArray<string>).includes(a),
      );
      if (requested.length === 0) {
        return NextResponse.json(
          { error: `agents must be a subset of ${VALID_AGENTS.join(', ')}` },
          { status: 400 },
        );
      }
      agents = requested;
    }
  } catch {
    // No body or malformed JSON — run all agents.
  }

  let result;
  try {
    result = await runAgentsForAnalysis(latest.id, session.organizationId, { agents });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    analysisId: result.analysisId,
    watcher: {
      ran: result.watcher.ran,
      eventsCreated: result.watcher.eventsCreated,
      status: result.watcher.run.status,
    },
    insight: {
      ran: result.insight.ran,
      recommendationsCreated: result.insight.recommendationsCreated,
      status: result.insight.run.status,
    },
    funding: {
      ran: result.funding.ran,
      outreachId: result.funding.outreachId,
      eligibleCount: result.funding.eligibleCount,
      almostCount: result.funding.almostCount,
      recommendedProgramId: result.funding.recommendedProgramId,
      status: result.funding.run.status,
    },
    totalDurationMs: result.totalDurationMs,
  });
}
