/**
 * POST /api/upload
 *
 * End-to-end ingestion:
 *   1. Parse the CSV (lib/csv/parser — no business logic changed)
 *   2. Aggregate by month (lib/csv/aggregate)
 *   3. Persist Statement + Transactions + Analysis (lib/db/persist)
 *   4. Run the orchestrator (lib/orchestrator) — Watcher + Insight +
 *      Funding Outreach, each writing its own AgentRun row and
 *      persisting WatchEvent / Recommendation / FundingOutreach rows
 *
 * Real backend, real LLM, real DB. No mock data. If the LLM is
 * unavailable or a rule blocks, the orchestrator falls back to
 * templated text (the agents already implement that) and the upload
 * still returns 200 with the analysisId — the analysis row is
 * persisted regardless of agent outcome.
 */

import { NextResponse } from 'next/server';
import { parseStatement } from '@/lib/csv/parser';
import { aggregateByMonth } from '@/lib/csv/aggregate';
import { persistFullPipeline } from '@/lib/db/persist';
import { prisma } from '@/lib/db/client';
import { getOrCreateDevSession } from '@/lib/auth/dev';
import { runAgentsForAnalysis } from '@/lib/orchestrator';

export const dynamic = 'force-dynamic';
// 60s is enough for the deterministic pipeline (1-2s) plus the 3
// agents (3-6 sequential LLM calls, each 1-5s on Qwen 3 30B via
// Nebius). If an LLM call times out, the orchestrator still persists
// the AgentRun with status='failed' — the analysis row is unaffected.
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file uploaded. Expected a multipart form with field "file".' },
      { status: 400 },
    );
  }
  const csvText = await file.text();
  if (csvText.length === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }
  const session = await getOrCreateDevSession();
  const { statement, errors } = parseStatement(csvText, {
    organizationId: session.organizationId,
    accountId: 'acc-dev-default',
    currency: 'XCD',
    filename: file.name,
  });
  if (errors.length > 0 && statement.transactions.length === 0) {
    return NextResponse.json(
      { error: 'No transactions could be parsed.', parseErrors: errors.slice(0, 5) },
      { status: 400 },
    );
  }
  const agg = aggregateByMonth(statement);
  const result = await persistFullPipeline(prisma, {
    organizationId: session.organizationId,
    statement,
    fileRef: `dev-uploads/${file.name}`,
    sizeBytes: csvText.length,
    monthly: agg.monthly,
    returnedPayments: agg.returnedPayments,
    loanPaymentTotal: agg.loanPaymentTotal,
  });

  // 4. Run the orchestrator. The analysis row is already persisted;
  //    the agents layer on top of it. If any agent fails, the upload
  //    still returns 200 — the analysis is the user-facing artifact.
  let orchestratorResult: Awaited<ReturnType<typeof runAgentsForAnalysis>> | null = null;
  let orchestratorError: string | null = null;
  try {
    orchestratorResult = await runAgentsForAnalysis(
      result.analysisId,
      session.organizationId,
    );
  } catch (e) {
    orchestratorError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    analysisId: result.analysisId,
    score: result.score,
    band: result.band,
    statementId: result.statementId,
    transactionsParsed: statement.transactions.length,
    monthsAnalyzed: agg.monthly.length,
    parseErrors: errors.length,
    agents: orchestratorResult
      ? {
          watcher: {
            ran: orchestratorResult.watcher.ran,
            eventsCreated: orchestratorResult.watcher.eventsCreated,
            status: orchestratorResult.watcher.run.status,
            model: orchestratorResult.watcher.run.model,
            durationMs: orchestratorResult.watcher.run.durationMs,
            tokensIn: orchestratorResult.watcher.run.tokensIn,
            tokensOut: orchestratorResult.watcher.run.tokensOut,
            emailDispatch: orchestratorResult.watcher.dispatch
              ? {
                  attempted: orchestratorResult.watcher.dispatch.attempted,
                  sent: orchestratorResult.watcher.dispatch.sent,
                  skipped: orchestratorResult.watcher.dispatch.skipped,
                  failed: orchestratorResult.watcher.dispatch.failed,
                  details: orchestratorResult.watcher.dispatch.details,
                }
              : null,
          },
          insight: {
            ran: orchestratorResult.insight.ran,
            recommendationsCreated: orchestratorResult.insight.recommendationsCreated,
            status: orchestratorResult.insight.run.status,
            model: orchestratorResult.insight.run.model,
            durationMs: orchestratorResult.insight.run.durationMs,
          },
          funding: {
            ran: orchestratorResult.funding.ran,
            outreachId: orchestratorResult.funding.outreachId,
            eligibleCount: orchestratorResult.funding.eligibleCount,
            almostCount: orchestratorResult.funding.almostCount,
            recommendedProgramId: orchestratorResult.funding.recommendedProgramId,
            status: orchestratorResult.funding.run.status,
            model: orchestratorResult.funding.run.model,
            durationMs: orchestratorResult.funding.run.durationMs,
          },
          totalDurationMs: orchestratorResult.totalDurationMs,
        }
      : null,
    orchestratorError,
  });
}
