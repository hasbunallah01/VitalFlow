/**
 * AgentRun ledger — the audit trail for every agent execution.
 *
 * Per docs/AGENTS.md rule 5: "Always accountable. Every execution
 * writes an AgentRun record." This module is the single write path
 * for the AgentRun table; agents return their result, the caller
 * (orchestrator) persists the run here.
 *
 * The row captures: which agent, which analysis, model, tokens,
 * duration, status (completed/failed/skipped/degraded), and any
 * warnings or errors. With this row, a judge can audit "what did
 * your agent do, when, with what model, and how long it took."
 */

import type { PrismaClient, RunStatus } from '@prisma/client';
import { createHash } from 'crypto';
import type { AgentRunSummary } from '../orchestrator/types';

type Db = PrismaClient;

export interface RecordAgentRunInput {
  agent: AgentRunSummary['agent'];
  agentVersion: string;
  analysisId: string;
  /** Stable hash of the input the agent saw. Used for reproducibility audits. */
  inputHash: string;
  /** The output the agent produced (JSON-serialisable). */
  output: unknown;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  status: RunStatus;
  warnings: ReadonlyArray<{ code: string; message: string }>;
  promptId: string | null;
}

/**
 * Compute a stable hash for an agent input. Used as the AgentRun.inputHash
 * so two identical inputs on different runs produce the same hash.
 * Hashes the JSON-canonicalised string with SHA-256, truncated to 16
 * hex chars for readability.
 */
export function hashAgentInput(input: unknown): string {
  const json = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/**
 * Persist one AgentRun row. The agent module's meta (version, promptId,
 * model) is written so the audit trail is self-describing.
 *
 * NOTE: the AgentRun model has no `errorMessage` column. Agent errors
 * are folded into the `warnings` JSON and the `output` JSON (with
 * `{ ok: false, error: ... }`) so the audit trail is still complete.
 */
export async function recordAgentRun(db: Db, input: RecordAgentRunInput) {
  return db.agentRun.create({
    data: {
      agent: input.agent,
      agentVersion: input.agentVersion,
      analysisId: input.analysisId,
      inputHash: input.inputHash,
      output: input.output as object,
      model: input.model,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      durationMs: input.durationMs,
      status: input.status,
      warnings: input.warnings as unknown as object,
      promptId: input.promptId,
      startedAt: new Date(Date.now() - input.durationMs),
      finishedAt: new Date(),
    },
  });
}
