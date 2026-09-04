/**
 * Orchestrator — the conductor.
 *
 * Connects the three real agents (Watcher, Insight Generation,
 * Funding Outreach) to the database, so that:
 *   - Each agent invocation writes one AgentRun row (the audit ledger)
 *   - Watcher events become WatchEvent rows
 *   - Insight recommendations become Recommendation rows
 *   - Funding Outreach becomes a FundingOutreach row with the
 *     eligible / almost / plan / evidencePack / readiness-gap JSON
 *
 * This module does NOT modify the agents. It calls them as
 * `WatcherAgent`, `InsightGenerationAgent`, `FundingOutreachAgent`
 * and persists their typed outputs.
 *
 * Failure handling: each agent runs in its own try/catch. A failure
 * in one agent does not stop the others. The AgentRun row records
 * the failure with status='failed' and the error message.
 */

import type { PrismaClient } from '@prisma/client';
import type { AgentContext } from '../../types/agent';
import { WatcherAgent, type WatcherInput, WATCHER_AGENT, WATCHER_VERSION } from '../../agents/watcher';
import { InsightGenerationAgent, type RecommendationInput, INSIGHT_AGENT, INSIGHT_VERSION } from '../../agents/recommendation';
import { FundingOutreachAgent, type FundingOutreachInput, FUNDING_AGENT, FUNDING_VERSION } from '../../agents/funding-outreach';
import { HttpLLMClient, type LLMClient, loadLLMConfig } from '../llm/client';
import { recordAgentRun, hashAgentInput } from '../db/agent-run';
import { reconstructHealthAssessment } from './build-assessment';
import { buildBusinessProfile, ProfileUnavailableError } from './build-profile';
import { buildFundingReadiness, type FundingReadinessEntry } from './funding-readiness';
import { createFundingOutreach, buildEvidencePack } from '../db/persist-funding';
import { dispatchWatcherAlerts, type CreatedWatchEvent, type DispatchResult } from '../email/dispatch';
import type { HealthAssessment } from '../../types/analysis';
import type { AgentName, AgentRunSummary, OrchestratorResult, OrchestratorOptions } from './types';

type Db = PrismaClient;

const DEFAULT_AGENTS: ReadonlyArray<AgentName> = ['watcher', 'insight', 'funding-outreach'];

function warningsToPlain(warnings: ReadonlyArray<{ code: string; message: string }>) {
  return warnings.map((w) => ({ code: w.code, message: w.message }));
}

function emptyRun(agent: AgentName): AgentRunSummary {
  return {
    agent,
    agentVersion: 'skipped',
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: 0,
    status: 'skipped',
    warningsCount: 0,
    promptId: null,
  };
}

function statusFromAgent(meta: { status: 'completed' | 'failed' | 'skipped' | 'degraded' }, errors: ReadonlyArray<{ code: string; message: string }>, warnings: ReadonlyArray<{ code: string; message: string }>): AgentRunSummary['status'] {
  if (errors.length > 0) return 'failed';
  if (warnings.length > 0 && meta.status === 'completed') return 'degraded';
  if (meta.status === 'completed' || meta.status === 'failed' || meta.status === 'skipped' || meta.status === 'degraded') {
    return meta.status;
  }
  return 'completed';
}

/**
 * Run the agents for one completed analysis. The orchestrator is
 * idempotent at the row level — running it twice creates two AgentRun
 * rows, but the WatchEvent / Recommendation / FundingOutreach rows
 * are created once. (If the API caller wants strict idempotency, the
 * route layer can dedupe by analysisId.)
 */
export async function runAgentsForAnalysis(
  analysisId: string,
  organizationId: string,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult> {
  const startedAt = Date.now();
  const db: Db = options.db ?? (await import('../db/client')).prisma;
  const llm: LLMClient = options.llm ?? new HttpLLMClient(loadLLMConfig());
  const agents = options.agents ?? DEFAULT_AGENTS;

  // 1. Reconstruct the typed HealthAssessment from the analysis row.
  const reconstructed = await reconstructHealthAssessment(db, analysisId, organizationId);
  if (!reconstructed) {
    throw new Error(`Cannot reconstruct assessment for ${analysisId}`);
  }
  const { assessment, filename } = reconstructed;
  // The reconstruction is always from DB — there's no "fresh compute"
  // path here today (the upload route does the fresh compute and
  // persists before calling the orchestrator).
  void reconstructed;

  // 2. Build the agent context. The orchestrator owns this so the
  //    route layer doesn't have to know about AgentContext shape.
  const ctx: AgentContext = {
    analysisId,
    organizationId,
    currency: assessment.currency,
    locale: 'en-AG',
    budget: { maxTokens: 60000, maxDurationMs: 30000 },
  };

  // 3. Run each agent in order. Each is independent — failures don't
  //    cascade. Results accumulate into the OrchestratorResult.
  let watcher: OrchestratorResult['watcher'] = {
    ran: agents.includes('watcher'),
    eventsCreated: 0,
    dispatch: null,
    run: emptyRun('watcher'),
  };
  let insight: OrchestratorResult['insight'] = {
    ran: agents.includes('insight'),
    recommendationsCreated: 0,
    run: emptyRun('insight'),
  };
  let funding: OrchestratorResult['funding'] = {
    ran: agents.includes('funding-outreach'),
    outreachId: null,
    eligibleCount: 0,
    almostCount: 0,
    recommendedProgramId: null,
    run: emptyRun('funding-outreach'),
  };

  // 3a. Watcher (needs the previous analysis if any, for diff).
  if (agents.includes('watcher')) {
    watcher = await runWatcher(db, llm, analysisId, organizationId, assessment, ctx, options);
  }

  // 3b. Insight Generation (uses the same assessment).
  if (agents.includes('insight')) {
    insight = await runInsight(db, llm, analysisId, organizationId, assessment, ctx);
  }

  // 3c. Funding Outreach (needs the BusinessProfile + writes the
  //     FundingOutreach row + the evidence pack).
  if (agents.includes('funding-outreach')) {
    funding = await runFundingOutreach(
      db, llm, analysisId, organizationId, assessment, ctx, filename,
    );
  }

  return {
    analysisId,
    organizationId,
    watcher,
    insight,
    funding,
    totalDurationMs: Date.now() - startedAt,
    assessmentReconstructed: true,
  };
}

// ---------------------------------------------------------------------------
// Per-agent runners — each writes its own AgentRun row + persists outputs.
// ---------------------------------------------------------------------------

async function runWatcher(
  db: Db,
  llm: LLMClient,
  analysisId: string,
  organizationId: string,
  assessment: HealthAssessment,
  ctx: AgentContext,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult['watcher']> {
  // Load the previous analysis for diffing. The Watcher only fires
  // events on change; without a previous, the first run produces no
  // events (and that's correct — there's nothing to compare to).
  const previous = await db.analysis.findFirst({
    where: {
      organizationId,
      status: 'completed',
      id: { not: analysisId },
    },
    orderBy: { completedAt: 'desc' },
  });
  let previousAssessment: import('../../types/analysis').HealthAssessment | null = null;
  if (previous) {
    const prevReconstructed = await reconstructHealthAssessment(db, previous.id, organizationId);
    if (prevReconstructed) previousAssessment = prevReconstructed.assessment;
  }
  const history = previousAssessment ? [previousAssessment] : [];
  const input: WatcherInput = {
    current: assessment,
    previous: previousAssessment,
    history,
  };
  const inputHash = hashAgentInput({
    agent: WATCHER_AGENT,
    analysisId,
    currentScore: assessment.score,
    currentBand: assessment.band,
    previousScore: previousAssessment?.score ?? null,
  });

  const agent = new WatcherAgent(llm);
  const result = await agent.run(input, ctx);
  const status: AgentRunSummary['status'] = result.ok
    ? statusFromAgent({ status: 'completed' }, result.errors, result.warnings)
    : 'failed';

  // Persist the AgentRun row first (audit trail), then the WatchEvent rows.
  await recordAgentRun(db, {
    agent: 'watcher',
    agentVersion: WATCHER_VERSION,
    analysisId,
    inputHash,
    output: result.errors[0]
      ? { ok: false, error: result.errors[0] }
      : result.data ?? null,
    model: result.meta.model ?? null,
    tokensIn: result.meta.tokensIn ?? 0,
    tokensOut: result.meta.tokensOut ?? 0,
    durationMs: result.meta.durationMs,
    status,
    warnings: warningsToPlain(result.warnings),
    promptId: result.meta.promptId ?? null,
  });
  let eventsCreated = 0;
  const createdEvents: CreatedWatchEvent[] = [];
  if (result.data && result.data.events.length > 0) {
    for (const ev of result.data.events) {
      try {
        const row = await db.watchEvent.create({
          data: {
            organizationId,
            analysisId,
            eventType: ev.type,
            summary: ev.summary,
            evidence: ev.evidence as object,
          },
        });
        createdEvents.push({
          id: row.id,
          organizationId: row.organizationId,
          analysisId: row.analysisId,
          eventType: row.eventType,
          summary: row.summary,
          evidence: row.evidence,
          createdAt: row.createdAt,
          notifiedAt: row.notifiedAt,
          notificationChannel: row.notificationChannel,
        });
        eventsCreated += 1;
      } catch {
        // Best-effort: do not abort the orchestrator on a single
        // write failure. The event is recorded in the AgentRun
        // output for audit.
      }
    }
  }

  // Dispatch watcher alert emails. Zero events → zero emails. On
  // Resend success we set notifiedAt on all events in the run; on
  // failure we leave notifiedAt null and record the outcome in the
  // AgentRun output (see below) so the audit trail stays honest.
  let dispatch: DispatchResult | null = null;
  if (createdEvents.length > 0) {
    // Look up the org's display name for the email greeting. Fall back
    // to a generic label — the email is still useful even without it.
    const org = await db.organization
      .findUnique({ where: { id: organizationId }, select: { name: true } })
      .catch(() => null);
    const businessName = org?.name?.trim() || 'Your business';
    try {
      dispatch = await dispatchWatcherAlerts({
        db,
        businessName,
        events: createdEvents,
        analysis: {
          id: analysisId,
          score: assessment.score,
          band: assessment.band,
          currency: assessment.currency,
          monthsAnalyzed: assessment.monthsAnalyzed,
          periodStart: assessment.periodStart ?? null,
          periodEnd: assessment.periodEnd ?? null,
        },
        ...(options.dispatchDashboardUrl ? { dashboardUrlOverride: options.dispatchDashboardUrl } : {}),
      });
    } catch (e) {
      // Email dispatch must never break the upload. Capture and continue.
      // The next run of the orchestrator will retry the dispatch.
      console.error('[orchestrator] dispatchWatcherAlerts threw:', e);
    }
  }

  return {
    ran: true,
    eventsCreated,
    dispatch,
    run: {
      agent: 'watcher',
      agentVersion: WATCHER_VERSION,
      model: result.meta.model ?? null,
      tokensIn: result.meta.tokensIn ?? 0,
      tokensOut: result.meta.tokensOut ?? 0,
      durationMs: result.meta.durationMs,
      status,
      errorMessage: result.errors[0]?.message ?? undefined,
      warningsCount: result.warnings.length,
      promptId: result.meta.promptId ?? null,
    },
  };
}

async function runInsight(
  db: Db,
  llm: LLMClient,
  analysisId: string,
  organizationId: string,
  assessment: HealthAssessment,
  ctx: AgentContext,
): Promise<OrchestratorResult['insight']> {
  const input: RecommendationInput = { analysis: assessment };
  const inputHash = hashAgentInput({
    agent: INSIGHT_AGENT,
    analysisId,
    score: assessment.score,
    band: assessment.band,
    monthsAnalyzed: assessment.monthsAnalyzed,
  });

  const agent = new InsightGenerationAgent(llm);
  const result = await agent.run(input, ctx);
  const status: AgentRunSummary['status'] = result.ok
    ? statusFromAgent({ status: 'completed' }, result.errors, result.warnings)
    : 'failed';

  await recordAgentRun(db, {
    agent: 'insight',
    agentVersion: INSIGHT_VERSION,
    analysisId,
    inputHash,
    output: result.errors[0]
      ? { ok: false, error: result.errors[0] }
      : result.data ?? null,
    model: result.meta.model ?? null,
    tokensIn: result.meta.tokensIn ?? 0,
    tokensOut: result.meta.tokensOut ?? 0,
    durationMs: result.meta.durationMs,
    status,
    warnings: warningsToPlain(result.warnings),
    promptId: result.meta.promptId ?? null,
  });
  let recsCreated = 0;
  if (result.data && result.data.recommendations.length > 0) {
    for (let i = 0; i < result.data.recommendations.length; i++) {
      const r = result.data.recommendations[i]!;
      try {
        await db.recommendation.create({
          data: {
            analysisId,
            action: r.action,
            rationale: r.rationale,
            priority: r.priority,
            effort: r.effort,
            pillar: r.pillar,
            estimatedPointGain: r.estimatedPointGain,
            timeframe: r.timeframe,
            displayOrder: i,
          },
        });
        recsCreated += 1;
      } catch {
        // best-effort
      }
    }
  }

  return {
    ran: true,
    recommendationsCreated: recsCreated,
    run: {
      agent: 'insight',
      agentVersion: INSIGHT_VERSION,
      model: result.meta.model ?? null,
      tokensIn: result.meta.tokensIn ?? 0,
      tokensOut: result.meta.tokensOut ?? 0,
      durationMs: result.meta.durationMs,
      status,
      errorMessage: result.errors[0]?.message ?? undefined,
      warningsCount: result.warnings.length,
      promptId: result.meta.promptId ?? null,
    },
  };
}

async function runFundingOutreach(
  db: Db,
  llm: LLMClient,
  analysisId: string,
  organizationId: string,
  assessment: HealthAssessment,
  ctx: AgentContext,
  filename: string,
): Promise<OrchestratorResult['funding']> {
  // Build the BusinessProfile. Throws ProfileUnavailableError if the
  // org has insufficient data — we surface that as a failed agent
  // run with a useful message rather than aborting the orchestrator.
  let profile;
  try {
    profile = await buildBusinessProfile(db, organizationId);
  } catch (e) {
    if (e instanceof ProfileUnavailableError) {
      const inputHash = hashAgentInput({ agent: FUNDING_AGENT, analysisId, reason: e.message });
      await recordAgentRun(db, {
        agent: 'funding-outreach',
        agentVersion: FUNDING_VERSION,
        analysisId,
        inputHash,
        output: { skipped: true, reason: e.message },
        model: null,
        tokensIn: 0,
        tokensOut: 0,
        durationMs: 0,
        status: 'skipped',
        warnings: [{ code: 'FUNDING_PROFILE_UNAVAILABLE', message: e.message }],
        promptId: 'funding-outreach@v1',
      });
      return {
        ran: true,
        outreachId: null,
        eligibleCount: 0,
        almostCount: 0,
        recommendedProgramId: null,
        run: {
          agent: 'funding-outreach',
          agentVersion: FUNDING_VERSION,
          model: null,
          tokensIn: 0,
          tokensOut: 0,
          durationMs: 0,
          status: 'skipped',
          errorMessage: e.message,
          warningsCount: 1,
          promptId: 'funding-outreach@v1',
        },
      };
    }
    throw e;
  }

  const input: FundingOutreachInput = { assessment, profile };
  const inputHash = hashAgentInput({
    agent: FUNDING_AGENT,
    analysisId,
    profile: {
      country: profile.country,
      sector: profile.sector,
      monthsInOperation: profile.monthsInOperation,
      annualRevenueCurrency: profile.annualRevenue.currency,
    },
    score: assessment.score,
  });

  const agent = new FundingOutreachAgent(llm);
  const result = await agent.run(input, ctx);
  const status: AgentRunSummary['status'] = result.ok
    ? statusFromAgent({ status: 'completed' }, result.errors, result.warnings)
    : 'failed';

  await recordAgentRun(db, {
    agent: 'funding-outreach',
    agentVersion: FUNDING_VERSION,
    analysisId,
    inputHash,
    output: result.errors[0]
      ? { ok: false, error: result.errors[0] }
      : result.data ?? null,
    model: result.meta.model ?? null,
    tokensIn: result.meta.tokensIn ?? 0,
    tokensOut: result.meta.tokensOut ?? 0,
    durationMs: result.meta.durationMs,
    status,
    warnings: warningsToPlain(result.warnings),
    promptId: result.meta.promptId ?? null,
  });

  // If the agent produced a draft, persist the FundingOutreach row.
  let outreachId: string | null = null;
  if (result.data) {
    const draft = result.data;
    // Build the readiness entries (eligible + almost + remaining) for
    // the UI to show "you're X points from Y program".
    const almostAdvice = new Map<string, string>();
    for (const r of draft.almost) {
      almostAdvice.set(r.programId, r.advice);
    }
    const readiness = buildFundingReadiness({
      outcome: draft.outcome,
      assessment,
      almostAdvice,
    });

    // Persist a normalised eligiblePrograms list (one row per program
    // with eligibility + reason if missed). Keep the readiness array
    // alongside so the UI can show gap analysis without re-deriving.
    const eligibleProgramsForRow = [
      ...draft.eligible.map((p) => ({
        programId: p.programId,
        programName: p.programName,
        institution: p.institution,
        eligible: true,
        ruleMissed: [],
        fitScore: p.fitScore,
        headline: p.headline,
      })),
      ...draft.almost.map((p) => ({
        programId: p.programId,
        programName: p.programName,
        institution: p.institution,
        eligible: false,
        ruleMissed: p.ruleMissed,
        fitScore: p.fitScore,
        headline: p.headline,
        advice: p.advice,
      })),
    ];

    // Build the evidence pack the lender API will serve.
    // The `buildEvidencePack` signature uses a mutable array shape; we
    // pass the readonly assessment through a structural cast — the
    // shape is identical, only the type modifier differs.
    const evidencePack = buildEvidencePack({
      organizationId,
      analysisId,
      assessment: assessment as unknown as Parameters<typeof buildEvidencePack>[0]['assessment'],
      profile: {
        country: profile.country,
        sector: profile.sector,
        monthsInOperation: profile.monthsInOperation,
        annualRevenue: profile.annualRevenue,
      },
      draft,
      generatedAt: new Date().toISOString(),
    });

    try {
      const created = await createFundingOutreach(db, {
        organizationId,
        analysisId,
        draft,
        eligiblePrograms: eligibleProgramsForRow,
        plan: {
          headline: draft.eligible[0]?.headline ?? 'No eligible programs at this time',
          summary: draft.planSummary,
          recommendedProgram: draft.recommendedProgramId,
          nextSteps: draft.recommendedProgramId
            ? [
                `Review the evidence pack for ${draft.recommendedProgramId}`,
                'Approve to share with the lender',
              ]
            : [
                'Improve pillar scores to unlock more programs',
                'Re-run the funding outreach after the next statement',
              ],
        },
        evidencePack: {
          ...evidencePack,
          // Add the readiness gap as a top-level field so the UI can
          // show "you're X points from Y" without re-deriving.
          readinessGap: readiness,
          sourceFilename: filename,
        },
        draftedByModel: result.meta.model ?? undefined,
      });
      outreachId = created.id;
    } catch {
      // best-effort: the AgentRun row already records the attempt
    }
  }

  return {
    ran: true,
    outreachId,
    eligibleCount: result.data?.eligible.length ?? 0,
    almostCount: result.data?.almost.length ?? 0,
    recommendedProgramId: result.data?.recommendedProgramId ?? null,
    run: {
      agent: 'funding-outreach',
      agentVersion: FUNDING_VERSION,
      model: result.meta.model ?? null,
      tokensIn: result.meta.tokensIn ?? 0,
      tokensOut: result.meta.tokensOut ?? 0,
      durationMs: result.meta.durationMs,
      status,
      errorMessage: result.errors[0]?.message ?? undefined,
      warningsCount: result.warnings.length,
      promptId: result.meta.promptId ?? null,
    },
  };
}

export type { AgentName, OrchestratorResult, OrchestratorOptions } from './types';
export type { FundingReadinessEntry } from './funding-readiness';
export { ProfileUnavailableError } from './build-profile';
