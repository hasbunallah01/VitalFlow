/**
 * Orchestrator types.
 *
 * The orchestrator runs the 3 agents (Watcher, Insight Generation,
 * Funding Outreach) on a completed analysis, persists each agent's
 * output to the database, and writes one AgentRun row per agent so
 * the audit trail is complete.
 *
 * Connect-only: this module wraps the existing agent classes in
 * `agents/` and persists to the existing Prisma models. It does NOT
 * modify the agents or the rules engines.
 */

import type { HealthAssessment } from '../../types/analysis';
import type { BusinessProfile } from '../../agents/funding-outreach/rules';

export type AgentName = 'watcher' | 'insight' | 'funding-outreach';

export interface AgentRunSummary {
  agent: AgentName;
  agentVersion: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  status: 'completed' | 'failed' | 'skipped' | 'degraded';
  errorMessage?: string;
  warningsCount: number;
  promptId: string | null;
}

export interface OrchestratorResult {
  analysisId: string;
  organizationId: string;
  watcher: {
    ran: boolean;
    eventsCreated: number;
    /**
     * Outcome of the Resend dispatch for this Watcher run. `null` when
     * no events were created (no email to send). When present, the
     * `details[].outcome` tells you per-event what happened:
     *   - 'sent'    → Resend accepted, notifiedAt was set
     *   - 'skipped' → no real recipient, or Resend not configured
     *   - 'failed'  → Resend rejected, notifiedAt stays null
     */
    dispatch: import('../email/dispatch').DispatchResult | null;
    run: AgentRunSummary;
  };
  insight: {
    ran: boolean;
    recommendationsCreated: number;
    run: AgentRunSummary;
  };
  funding: {
    ran: boolean;
    outreachId: string | null;
    eligibleCount: number;
    almostCount: number;
    recommendedProgramId: string | null;
    run: AgentRunSummary;
  };
  /** Wall clock for the whole orchestration (sum of agent durations). */
  totalDurationMs: number;
  /** True if the analysis was reconstructed from DB. */
  assessmentReconstructed: boolean;
}

export interface OrchestratorOptions {
  /**
   * Which agents to run. Defaults to all three.
   * Each agent is independent — failures in one don't stop the others.
   */
  agents?: ReadonlyArray<AgentName>;
  /**
   * Override the LLM client (for tests). When omitted, the orchestrator
   * creates an HttpLLMClient from env via loadLLMConfig().
   */
  llm?: import('../../lib/llm/client').LLMClient;
  /**
   * Override the Prisma client (for tests with isolated transactions).
   */
  db?: import('@prisma/client').PrismaClient;
  /**
   * Override the dashboard URL that gets baked into Watcher alert emails.
   * Useful for tests. Falls back to NEXT_PUBLIC_APP_URL.
   */
  dispatchDashboardUrl?: string;
}

export interface ReconstructedAnalysis {
  assessment: HealthAssessment;
  profile: BusinessProfile;
  /** Filename of the source statement, for evidence-pack provenance. */
  filename: string;
  /** True if the assessment was reconstructed from DB; false if freshly computed. */
  reconstructed: boolean;
}
