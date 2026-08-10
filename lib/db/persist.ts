/**
 * Persistence layer — bridges the typed analysis world to Prisma.
 *
 * The boundary is here: the math modules and the CSV parser work with
 * pure types (`Statement`, `HealthAssessment`). This module maps those
 * into the Prisma schema and persists them transactionally.
 *
 * Design rules:
 *  1. Every public function takes a `PrismaClient` so tests can inject
 *     a transaction-isolated client.
 *  2. Multi-row writes (Statement + Transactions + Counterparties) go
 *     in a single Prisma `$transaction` so partial writes can't happen.
 *  3. Money values cross the BigInt boundary cleanly: we pass `bigint`
 *     to Prisma and accept `bigint` back. Display serialization is the
 *     caller's responsibility.
 *  4. The mapping from our typed `Transaction.narrative` to Prisma
 *     `description` + `normalizedDescription` + `category` is the
 *     single point where categorization lives at the DB boundary.
 *     The CSV aggregator does its own categorization for math; this
 *     one mirrors it so the DB row matches what the analysis saw.
 */

import type { PrismaClient } from '@prisma/client';
import type {
  HealthAssessment,
  PillarScore,
  Metric as AnalysisMetric,
  MonthlyAggregate,
  AnomalyDetail,
} from '../../types/analysis';
import type {
  Statement as TypedStatement,
  Transaction as TypedTransaction,
} from '../../types/transaction';
import type {
  Direction as PrismaDirection,
  CategorySource as PrismaCategorySource,
  HealthBand as PrismaHealthBand,
  StatementStatus as PrismaStatementStatus,
  AnalysisStatus as PrismaAnalysisStatus,
} from '@prisma/client';

type Db = PrismaClient;

// ---------------------------------------------------------------------------
// Mapping helpers (typed → Prisma)
// ---------------------------------------------------------------------------

const isInflow = (t: TypedTransaction): boolean =>
  t.amount.amountMinor > 0n;

const isOutflow = (t: TypedTransaction): boolean =>
  t.amount.amountMinor < 0n;

function toDate(iso: string): Date {
  // ISODate is 'YYYY-MM-DD'. Construct as UTC midnight to avoid tz drift.
  return new Date(`${iso}T00:00:00.000Z`);
}

function fromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toBigInt(minor: bigint | undefined | null): bigint {
  if (minor === undefined || minor === null) return 0n;
  return minor;
}

function optionalBigInt(minor: bigint | undefined | null): bigint | null {
  if (minor === undefined || minor === null) return null;
  return minor;
}

/**
 * Same keyword heuristic as the CSV aggregator. Kept in lockstep.
 * The LLM layer in Phase 2 may override this.
 */
function categorizeNarrative(narrative: string): string {
  const n = narrative.toUpperCase();
  if (n.includes('STANDING ORDER RENT') || n.includes('RENT -')) return 'rent';
  if (n.includes('SALARY') || n.includes('PAYROLL')) return 'salaries';
  if (n.includes('UTILITY') || n.includes('LIGHT & POWER') || n.includes('WATER')) return 'utilities';
  if (n.includes('FUEL STATION')) return 'fuel';
  if (n.includes('CATERING SUPPLIES') || n.includes('ISLAND FOOD') || n.includes('PACKAGING') || n.includes('WHOLESALE')) return 'suppliers';
  if (n.includes('LOAN') || n.includes('MORTGAGE')) return 'loan_payment';
  if (n.includes('SUBSCRIPTION') || n.includes('DD SUBSCRIPTION')) return 'subscriptions';
  if (n.includes('NSF') || n.includes('RETURNED ITEM') || n.includes('BANK FEE') || n.includes('SERVICE CHARGE')) return 'fees';
  return 'other';
}

function counterpartyName(narrative: string): string | null {
  const m = /^TRANSFER FROM (.+?)(?:\s+INV\d+)?$/i.exec(narrative.trim());
  if (m) return m[1]!.trim();
  return null;
}

function normalizeKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function directionOf(t: TypedTransaction): PrismaDirection {
  return isInflow(t) ? 'inflow' : 'outflow';
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export interface CreateOrganizationInput {
  name: string;
  defaultCurrency: string;
  country?: string;
  sector?: string;
}

export async function createOrganization(
  db: Db,
  input: CreateOrganizationInput,
) {
  return db.organization.create({
    data: {
      name: input.name,
      defaultCurrency: input.defaultCurrency,
      country: input.country,
      sector: input.sector,
    },
  });
}

// ---------------------------------------------------------------------------
// Statement + Transactions + Counterparties (one transaction)
// ---------------------------------------------------------------------------

export interface SaveStatementInput {
  organizationId: string;
  /** The typed Statement produced by lib/csv/parser. */
  statement: TypedStatement;
  /**
   * Object-storage key for the raw CSV. In the MVP this can be a synthetic
   * value (e.g. the SHA-256 of the file). The real upload handler will
   * set this to the S3 key.
   */
  fileRef: string;
  /** Size of the raw CSV in bytes. Pass 0 if unknown. */
  sizeBytes: number;
}

export async function saveStatement(db: Db, input: SaveStatementInput) {
  const { organizationId, statement, fileRef, sizeBytes } = input;
  return db.$transaction(async (tx) => {
    // 1. Counterparties: extract unique names from inflows, upsert.
    const cpNames = new Set<string>();
    for (const t of statement.transactions) {
      if (isInflow(t)) {
        const name = counterpartyName(t.narrative);
        if (name) cpNames.add(name);
      }
    }
    const counterpartyByName = new Map<string, string>();
    for (const name of cpNames) {
      const key = normalizeKey(name);
      const cp = await tx.counterparty.upsert({
        where: {
          organizationId_normalizedKey: {
            organizationId,
            normalizedKey: key,
          },
        },
        create: {
          organizationId,
          displayName: name,
          normalizedKey: key,
          type: 'customer',
        },
        update: {},
      });
      counterpartyByName.set(name, cp.id);
    }

    // 2. Statement row. We let Prisma generate the id (cuid) so the same
    //    parsed Statement can be re-persisted in tests without colliding.
    const persisted = await tx.statement.create({
      data: {
        organizationId,
        filename: statement.sourceFilename,
        fileRef,
        sizeBytes,
        checksum: statement.sourceHash,
        status: 'validated' as PrismaStatementStatus,
        currency: statement.currency,
        periodStart: toDate(statement.periodStart),
        periodEnd: toDate(statement.periodEnd),
        columnMapping: {
          ...statement.columnMapping,
          dateFormat: statement.dateFormat,
        },
        hasBalanceColumn: statement.transactions.some(
          (t) => t.balanceAfterMinor !== undefined,
        ),
        qualityReport: {
          rowCount: statement.transactions.length,
          parseable: true,
          sourceStatementId: statement.id,
        },
        retentionExpiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000, // RAW_FILE_RETENTION_DAYS = 30
        ),
      },
    });

    // 3. Transactions. createMany is the right tool but it can't do
    //    counterparty lookup inline, so we map in memory. We let Prisma
    //    generate the id (cuid) so the same parsed Statement can be
    //    re-persisted in tests without colliding on id.
    if (statement.transactions.length > 0) {
      await tx.transaction.createMany({
        data: statement.transactions.map((t, idx) => ({
          statementId: persisted.id,
          organizationId,
          date: toDate(t.date),
          description: t.narrative,
          normalizedDescription: t.narrative.toUpperCase().trim(),
          amountMinor: toBigInt(t.amount.amountMinor),
          currency: t.amount.currency,
          balanceMinor: optionalBigInt(t.balanceAfterMinor),
          direction: directionOf(t),
          category: isOutflow(t) ? categorizeNarrative(t.narrative) : null,
          categorySource: 'rule' as PrismaCategorySource,
          counterpartyId: isInflow(t)
            ? counterpartyName(t.narrative)
              ? counterpartyByName.get(counterpartyName(t.narrative)!) ?? null
              : null
            : null,
          isTransfer: counterpartyName(t.narrative) !== null,
          isRecurring: false, // Recurring detection is Phase 2
          rowNumber: idx,
        })),
        skipDuplicates: true,
      });
    }

    return persisted;
  });
}

// ---------------------------------------------------------------------------
// Analysis + Metrics (one transaction)
// ---------------------------------------------------------------------------

function bandToPrisma(band: string): PrismaHealthBand {
  const map: Record<string, PrismaHealthBand> = {
    strong: 'Strong',
    healthy: 'Healthy',
    watch: 'Watch',
    fragile: 'Fragile',
    critical: 'Critical',
  };
  return map[band] ?? 'Watch';
}

function unitFor(metricId: string): string {
  if (metricId.endsWith('cv')) return 'ratio';
  if (metricId.endsWith('recurring')) return 'ratio';
  if (metricId.endsWith('hhi')) return 'ratio';
  if (metricId.endsWith('leverage_gap')) return 'ratio';
  if (metricId.endsWith('discretionary')) return 'ratio';
  if (metricId.endsWith('max_drawdown')) return 'ratio';
  if (metricId.endsWith('buffer_cv')) return 'ratio';
  if (metricId.endsWith('positivity')) return 'ratio';
  if (metricId.endsWith('trend')) return 'ratio_per_month';
  if (metricId.endsWith('runway')) return 'months';
  if (metricId.endsWith('days_cash')) return 'days';
  if (metricId.endsWith('fixed_cover')) return 'ratio';
  if (metricId.endsWith('consecutive_negative')) return 'months';
  if (metricId.endsWith('overdraft_days')) return 'days';
  if (metricId.endsWith('returned_payments')) return 'count';
  if (metricId.endsWith('large_outflow')) return 'count';
  if (metricId.endsWith('loan_stress')) return 'ratio';
  if (metricId.endsWith('structural_events')) return 'count';
  return 'unknown';
}

function pillarFor(metricId: string): string | null {
  if (metricId.startsWith('cashflow.')) return 'cashflow';
  if (metricId.startsWith('revenue.')) return 'revenue';
  if (metricId.startsWith('expenses.')) return 'expenses';
  if (metricId.startsWith('liquidity.')) return 'liquidity';
  if (metricId.startsWith('risk.')) return 'risk';
  return null;
}

export interface SaveAnalysisInput {
  organizationId: string;
  statementId: string;
  assessment: HealthAssessment;
}

export async function saveAnalysis(db: Db, input: SaveAnalysisInput) {
  const { organizationId, statementId, assessment } = input;
  return db.$transaction(async (tx) => {
    const analysis = await tx.analysis.create({
      data: {
        id: assessment.id,
        organizationId,
        statementId,
        status: 'completed' as PrismaAnalysisStatus,
        stage: 'scored',
        progressPercent: 100,
        score: Math.round(assessment.score),
        band: bandToPrisma(assessment.band),
        pillars: assessment.pillars.map((p) => ({
          id: p.id,
          label: p.label,
          maxPoints: p.maxPoints,
          points: p.points,
          confidence: p.confidence,
          metrics: p.metrics.map((m) => ({
            id: m.id,
            label: m.label,
            value: m.value,
            weight: m.weight,
            contribution: m.contribution,
            confidence: m.confidence,
            provenance: m.provenance,
            explanation: m.explanation,
          })),
        })),
        confidence: assessment.confidence,
        scoringVersion: 'scoring@0.1.0',
        startedAt: new Date(Date.now() - 1000),
        completedAt: new Date(),
        totalTokens: 0,
        estimatedCostMicros: 0n,
      },
    });

    // Persist one Metric row per AnalysisMetric so the DB is queryable
    // by metric.key without parsing the JSON pillars blob.
    const metricRows: Array<{
      analysisId: string;
      key: string;
      value: number;
      unit: string;
      currency: string | null;
      pillar: string | null;
      confidence: number;
    }> = [];
    for (const p of assessment.pillars) {
      for (const m of p.metrics) {
        metricRows.push({
          analysisId: analysis.id,
          key: m.id,
          value: m.value,
          unit: unitFor(m.id),
          currency: null, // metrics are ratios/counts, not money
          pillar: pillarFor(m.id),
          confidence: m.confidence,
        });
      }
    }
    if (metricRows.length > 0) {
      await tx.metric.createMany({ data: metricRows });
    }

    return analysis;
  });
}

// ---------------------------------------------------------------------------
// Read-back helpers (for the integration test + future UI use)
// ---------------------------------------------------------------------------

export async function loadStatement(db: Db, id: string) {
  return db.statement.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { date: 'asc' } },
    },
  });
}

export async function loadAnalysis(db: Db, id: string) {
  return db.analysis.findUnique({
    where: { id },
    include: {
      metrics: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Round-trip the parser/aggregate output through Prisma
// ---------------------------------------------------------------------------

export interface PersistPipelineInput {
  organizationId: string;
  statement: TypedStatement;
  fileRef: string;
  sizeBytes: number;
  monthly: ReadonlyArray<MonthlyAggregate>;
  returnedPayments: number;
  loanPaymentTotal: number;
}

export interface PersistPipelineOutput {
  statementId: string;
  analysisId: string;
  score: number;
  band: string;
}

export async function persistFullPipeline(
  db: Db,
  input: PersistPipelineInput,
): Promise<PersistPipelineOutput> {
  // 1. Statement
  const statement = await saveStatement(db, {
    organizationId: input.organizationId,
    statement: input.statement,
    fileRef: input.fileRef,
    sizeBytes: input.sizeBytes,
  });

  // 2. Compute the analysis in-process (this is the deterministic core;
  //    in production the Watcher Agent would schedule this async).
  const { computeScore } = await import('../analysis/score');
  const { assessment } = computeScore({
    organizationId: input.organizationId,
    statementId: statement.id,
    currency: statement.currency ?? input.statement.currency,
    periodStart: input.statement.periodStart,
    periodEnd: input.statement.periodEnd,
    monthly: input.monthly,
    returnedPayments: input.returnedPayments,
    loanPaymentTotal: input.loanPaymentTotal,
  });

  // 3. Analysis + metrics
  const analysis = await saveAnalysis(db, {
    organizationId: input.organizationId,
    statementId: statement.id,
    assessment,
  });

  return {
    statementId: statement.id,
    analysisId: analysis.id,
    score: assessment.score,
    band: assessment.band,
  };
}

// Re-export type aliases for convenience
export type {
  PrismaDirection,
  PrismaCategorySource,
  PrismaHealthBand,
  PrismaStatementStatus,
  PrismaAnalysisStatus,
};
// Re-export the helper for callers that want it
export { toDate, fromDate, fromDate as isoFromDate };
// Suppress unused-import warning for AnomalyDetail
void (null as unknown as AnomalyDetail);
void (null as unknown as AnalysisMetric);
void (null as unknown as PillarScore);
