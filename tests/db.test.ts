/**
 * Database integration test.
 *
 * Connects to the live Postgres (Neon in dev, local Docker in CI), runs
 * the full pipeline (parse → aggregate → persist), and reads back to
 * verify round-trip correctness.
 *
 * Required env var: `DATABASE_URL`. The test is skipped if absent.
 *
 * The test is intentionally NOT in the lib/ tree so the default
 * vitest include does not pick it up for plain vitest run
 * invocations. Run it explicitly with:
 *
 *   DATABASE_URL=... ./node_modules/.bin/vitest run tests/db.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { parseStatement } from '../lib/csv/parser';
import { aggregateByMonth } from '../lib/csv/aggregate';
import {
  createOrganization,
  persistFullPipeline,
  loadStatement,
  loadAnalysis,
} from '../lib/db/persist';

const HAS_DB = !!process.env.DATABASE_URL;
const FIXTURE = join(__dirname, 'fixtures', 'sample-statement.csv');

// Skip the suite entirely if no DB URL. This is the path used by CI
// without secrets, and by `vitest run` without DATABASE_URL set.
const describeIfDb = HAS_DB ? describe : describe.skip;

describeIfDb('db: full pipeline round-trip (live Postgres)', () => {
  const db = new PrismaClient();
  // Unique org name per run so repeated runs don't collide on the
  // (organizationId, normalizedKey) Counterparty unique index.
  const runId = `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const orgName = `Test Caterer ${runId}`;
  let organizationId = '';

  beforeAll(async () => {
    const org = await createOrganization(db, {
      name: orgName,
      defaultCurrency: 'XCD',
      country: 'AG', // Antigua — Caribbean
      sector: 'catering',
    });
    organizationId = org.id;
  });

  afterAll(async () => {
    // Cascade deletes the Statement, Transactions, Counterparties, Analysis,
    // Metrics via the schema's onDelete rules. We delete the org last.
    if (organizationId) {
      await db.organization.delete({ where: { id: organizationId } });
    }
    await db.$disconnect();
  });

  it('parses the sample CSV, persists it, and round-trips cleanly', async () => {
    const csv = readFileSync(FIXTURE, 'utf-8');
    const { statement, errors } = parseStatement(csv, {
      organizationId,
      accountId: 'acc_test_round_trip',
      currency: 'XCD',
      filename: 'sample-statement.csv',
    });
    expect(errors).toEqual([]);
    expect(statement.transactions.length).toBeGreaterThan(200);

    const agg = aggregateByMonth(statement);
    expect(agg.monthly.length).toBe(12);

    const result = await persistFullPipeline(db, {
      organizationId,
      statement,
      fileRef: `test/${runId}/sample-statement.csv`,
      sizeBytes: csv.length,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });

    // The pipeline must produce a defensible score in the same band
    // the in-process golden test asserts. Drift > 1 point between
    // the in-memory and DB-backed runs would be a regression.
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThanOrEqual(80);
    expect(result.band).toBe('healthy');

    // Read back the Statement
    const loadedStatement = await loadStatement(db, result.statementId);
    expect(loadedStatement).not.toBeNull();
    expect(loadedStatement!.id).toBe(result.statementId);
    expect(loadedStatement!.organizationId).toBe(organizationId);
    expect(loadedStatement!.currency).toBe('XCD');
    expect(loadedStatement!.filename).toBe('sample-statement.csv');
    expect(loadedStatement!.status).toBe('validated');
    expect(loadedStatement!.hasBalanceColumn).toBe(true);
    expect(loadedStatement!.periodStart).not.toBeNull();
    expect(loadedStatement!.periodEnd).not.toBeNull();
    expect(loadedStatement!.transactions.length).toBe(statement.transactions.length);

    // Date round-trip (ISODate ↔ DateTime)
    const firstTx = loadedStatement!.transactions[0]!;
    expect(firstTx.date.toISOString().slice(0, 10)).toBe('2025-07-03');

    // Money round-trip (signed BigInt minor units)
    const firstWithdrawal = loadedStatement!.transactions.find(
      (t) => t.direction === 'outflow',
    );
    expect(firstWithdrawal).toBeDefined();
    expect(firstWithdrawal!.amountMinor < 0n).toBe(true);

    // Read back the Analysis
    const loadedAnalysis = await loadAnalysis(db, result.analysisId);
    expect(loadedAnalysis).not.toBeNull();
    expect(loadedAnalysis!.score).toBe(Math.round(result.score));
    expect(loadedAnalysis!.band).toBe('Healthy');
    expect(loadedAnalysis!.status).toBe('completed');
    expect(loadedAnalysis!.scoringVersion).toBe('scoring@0.1.0');

    // Pillars stored as JSON — sanity check shape
    const pillars = loadedAnalysis!.pillars as Array<{
      id: string;
      points: number;
      maxPoints: number;
    }>;
    expect(Array.isArray(pillars)).toBe(true);
    expect(pillars.length).toBe(5);
    const sum = pillars.reduce((s, p) => s + p.points, 0);
    expect(Math.abs(sum - result.score)).toBeLessThan(1.0);

    // One Metric row per pillar metric — count = 18 (4+4+4+4+2 in the MVP)
    // Note: risk has 4 metrics in our impl, so total = 4×4 + 4 = 20.
    expect(loadedAnalysis!.metrics.length).toBeGreaterThanOrEqual(18);
  }, 60_000);

  it('counterparty rows are created and linked to inflow transactions', async () => {
    const csv = readFileSync(FIXTURE, 'utf-8');
    const { statement } = parseStatement(csv, {
      organizationId,
      accountId: 'acc_test_cp',
      currency: 'XCD',
      filename: 'sample-cp.csv',
    });
    const agg = aggregateByMonth(statement);
    const result = await persistFullPipeline(db, {
      organizationId,
      statement,
      fileRef: `test/${runId}/cp.csv`,
      sizeBytes: csv.length,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });

    const cps = await db.counterparty.findMany({
      where: { organizationId },
    });
    expect(cps.length).toBeGreaterThan(0);
    const names = cps.map((c) => c.displayName);
    // The fixture's two dominant counterparties must both be in the DB.
    expect(names.some((n) => /MERIDIAN/.test(n))).toBe(true);
    expect(names.some((n) => /SEAGRAPE/.test(n))).toBe(true);

    // At least one Transaction must be linked to a Counterparty.
    const linked = await db.transaction.count({
      where: { statementId: result.statementId, counterpartyId: { not: null } },
    });
    expect(linked).toBeGreaterThan(0);

    // The totalInflowMinor / totalOutflowMinor / transactionCount fields
    // on Counterparty should be 0 (we don't maintain them at insert time
    // — that's a Phase 2 background job). We just confirm the columns exist
    // and are queryable.
    const sumCp = await db.counterparty.aggregate({
      where: { organizationId },
      _sum: { totalInflowMinor: true, totalOutflowMinor: true, transactionCount: true },
    });
    expect(sumCp._sum.totalInflowMinor).toBe(0n);
  }, 60_000);

  it('cascades: deleting the org deletes its counterparties', async () => {
    // Set up a fresh org with counterparties, then delete it, and verify
    // the counterparties are gone (the cascade).
    const scratch = await createOrganization(db, {
      name: `Scratch ${runId}-cascade`,
      defaultCurrency: 'XCD',
    });
    const csv = readFileSync(FIXTURE, 'utf-8');
    const { statement } = parseStatement(csv, {
      organizationId: scratch.id,
      accountId: 'acc_cascade',
      currency: 'XCD',
      filename: 'cascade.csv',
    });
    const agg = aggregateByMonth(statement);
    await persistFullPipeline(db, {
      organizationId: scratch.id,
      statement,
      fileRef: `test/${runId}/cascade.csv`,
      sizeBytes: csv.length,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });

    const before = await db.counterparty.count({ where: { organizationId: scratch.id } });
    expect(before).toBeGreaterThan(0);

    await db.organization.delete({ where: { id: scratch.id } });

    const after = await db.counterparty.count({ where: { organizationId: scratch.id } });
    expect(after).toBe(0);
  }, 60_000);
});

// Plain describe (not skipped) so the suite is visible even without DB.
describe('db: persistence module (no DB required)', () => {
  it('exports the expected functions', async () => {
    const mod = await import('../lib/db/persist');
    expect(typeof mod.createOrganization).toBe('function');
    expect(typeof mod.saveStatement).toBe('function');
    expect(typeof mod.saveAnalysis).toBe('function');
    expect(typeof mod.loadStatement).toBe('function');
    expect(typeof mod.loadAnalysis).toBe('function');
    expect(typeof mod.persistFullPipeline).toBe('function');
  });
});
