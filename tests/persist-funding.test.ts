/**
 * Funding Outreach persistence + state machine + underwriting tests.
 * Skipped without DATABASE_URL.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createOrganization, saveStatement, saveAnalysis } from '../lib/db/persist';
import {
  createFundingOutreach,
  approveFundingOutreach,
  shareFundingOutreach,
  revokeFundingOutreach,
  lenderViewedShareLink,
  completeFundingOutreach,
  buildEvidencePack,
} from '../lib/db/persist-funding';
import { getUnderwritingProfile, ShareLinkInvalidError } from '../lib/funding/underwriting';
import { computeScore } from '../lib/analysis/score';
import { aggregateByMonth } from '../lib/csv/aggregate';
import { parseStatement } from '../lib/csv/parser';
import { persistFullPipeline } from '../lib/db/persist';
import { readFileSync } from 'fs';
import { join } from 'path';

const HAS_DB = !!process.env.DATABASE_URL;
const describeIfDb = HAS_DB ? describe : describe.skip;

describeIfDb('funding state machine (live DB)', () => {
  const db = new PrismaClient();
  const runId = `funding-${Date.now()}`;
  let organizationId = '';
  let outreachId = '';

  beforeAll(async () => {
    const org = await createOrganization(db, {
      name: `Test Caterer ${runId}`,
      defaultCurrency: 'XCD',
      country: 'AG',
      sector: 'tourism',
    });
    organizationId = org.id;

    // Build a real Statement + Analysis so the funding FK constraints pass
    const csv = readFileSync(join(__dirname, 'fixtures', 'sample-statement.csv'), 'utf-8');
    const { statement, errors } = parseStatement(csv, {
      organizationId,
      accountId: 'acc-funding-test',
      currency: 'XCD',
      filename: 'funding-test.csv',
    });
    expect(errors).toEqual([]);
    const agg = aggregateByMonth(statement);
    // We need a real analysisId. Use persistFullPipeline which actually
    // saves the Statement and Analysis rows in the DB.
    const result = await persistFullPipeline(db, {
      organizationId,
      statement,
      fileRef: `test/${runId}/funding.csv`,
      sizeBytes: csv.length,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });
    // Stash the analysisId on the org via a side-channel for the tests below.
    (org as any).__analysisId = result.analysisId;
  });

  function getAnalysisId(): string {
    return (db.organization.findUnique({ where: { id: organizationId } }) as any).__analysisId
      || ((globalThis as any).__testAnalysisId as string);
  }

  // Helper: get the persisted analysisId by querying the DB
  async function realAnalysisId(): Promise<string> {
    const a = await db.analysis.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    if (!a) throw new Error('No analysis found');
    return a.id;
  }

  afterAll(async () => {
    if (organizationId) {
      await db.organization.delete({ where: { id: organizationId } });
    }
    await db.$disconnect();
  });

  it('full lifecycle: draft → approve → share → view → complete', async () => {
    const analysisId = await realAnalysisId();
    // 1. Create
    const evidence = buildEvidencePack({
      organizationId,
      analysisId,
      assessment: {
        score: 75,
        band: 'healthy',
        pillars: [],
        anomalies: { returnedPayments: 0, overdraftDays: 0, structuralBreaks: 0, rapidDeteriorationDetected: false, details: [] },
        monthly: [],
        periodStart: '2025-07-01',
        periodEnd: '2026-06-29',
      },
      profile: { country: 'AG', sector: 'tourism', monthsInOperation: 24, annualRevenue: { amount: 500000, currency: 'USD' } },
      draft: {
        eligible: [],
        almost: [],
        recommendedProgramId: 'cdb-lc-msme',
        planSummary: 'Test plan',
        outcome: { eligible: [], almost: [], evaluated: [] },
        tokensIn: 0,
        tokensOut: 0,
        llmUsed: false,
      },
      generatedAt: new Date().toISOString(),
    });
    const created = await createFundingOutreach(db, {
      organizationId,
      analysisId,
      draft: {
        eligible: [],
        almost: [],
        recommendedProgramId: 'cdb-lc-msme',
        planSummary: 'Test plan',
        outcome: { eligible: [], almost: [], evaluated: [] },
        tokensIn: 0,
        tokensOut: 0,
        llmUsed: false,
      },
      eligiblePrograms: [{ programId: 'cdb-lc-msme', programName: 'CDB SLU MSME', institution: 'CDB', eligible: true, ruleMissed: [] }],
      plan: { headline: 'Apply for CDB Loan-Grant', summary: 'Test summary', recommendedProgram: 'cdb-lc-msme', nextSteps: ['Step 1', 'Step 2'] },
      evidencePack: evidence,
    });
    expect(created.status).toBe('drafted');
    outreachId = created.id;

    // 2. Approve
    const approved = await approveFundingOutreach(db, {
      outreachId,
      approverUserId: 'user-test-approver',
    });
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).not.toBeNull();
    expect(approved.approvedByUserId).toBe('user-test-approver');

    // 3. Share (creates ShareLink)
    const shared = await shareFundingOutreach(db, { outreachId });
    expect(shared.status).toBe('shared');
    expect(shared.shareLinkId).not.toBeNull();

    // 4. Lender opens the link
    const link = await db.shareLink.findUnique({ where: { id: shared.shareLinkId! } });
    expect(link).not.toBeNull();
    const viewResult = await lenderViewedShareLink(db, link!.token);
    expect(viewResult.justTransitioned).toBe(true);
    expect(viewResult.outreach?.status).toBe('viewed');
    expect(viewResult.outreach?.viewCount).toBe(1);

    // 5. Second view doesn't transition again
    const viewResult2 = await lenderViewedShareLink(db, link!.token);
    expect(viewResult2.justTransitioned).toBe(false);
    expect(viewResult2.outreach?.viewCount).toBe(2);

    // 6. Underwriting API returns the evidence pack
    const underwriting = await getUnderwritingProfile(db, link!.token);
    expect(underwriting.outreach.id).toBe(outreachId);
    expect(underwriting.outreach.status).toBe('viewed');
    expect(underwriting.outreach.evidencePack).toBeDefined();

    // 7. Complete
    const completed = await completeFundingOutreach(db, outreachId);
    expect(completed.status).toBe('completed');
  }, 60_000);

  it('rejects approve when status is not drafted', async () => {
    // Already completed from the previous test
    await expect(
      approveFundingOutreach(db, { outreachId, approverUserId: 'x' }),
    ).rejects.toThrow(/Cannot approve/);
  });

  it('rejects share when status is not approved', async () => {
    await expect(
      shareFundingOutreach(db, { outreachId }),
    ).rejects.toThrow(/Cannot share/);
  });

  it('revoke works at any state and blocks the share link', async () => {
    const analysisId = await realAnalysisId();
    // Create a fresh outreach to test revoke
    const created = await createFundingOutreach(db, {
      organizationId,
      analysisId,
      draft: {
        eligible: [],
        almost: [],
        recommendedProgramId: null,
        planSummary: 'Test',
        outcome: { eligible: [], almost: [], evaluated: [] },
        tokensIn: 0,
        tokensOut: 0,
        llmUsed: false,
      },
      eligiblePrograms: [],
      plan: { headline: 'x', summary: 'x', recommendedProgram: null, nextSteps: [] },
      evidencePack: {},
    });
    const approved = await approveFundingOutreach(db, { outreachId: created.id, approverUserId: 'x' });
    const shared = await shareFundingOutreach(db, { outreachId: approved.id });
    const link = await db.shareLink.findUnique({ where: { id: shared.shareLinkId! } });
    // Revoke
    await revokeFundingOutreach(db, approved.id);
    // The share link should now be revoked
    const linkAfter = await db.shareLink.findUnique({ where: { id: shared.shareLinkId! } });
    expect(linkAfter?.revokedAt).not.toBeNull();
    // The underwriting API should refuse
    await expect(getUnderwritingProfile(db, link!.token)).rejects.toBeInstanceOf(ShareLinkInvalidError);
  }, 60_000);

  it('rejects expired share link', async () => {
    const analysisId = await realAnalysisId();
    const created = await createFundingOutreach(db, {
      organizationId,
      analysisId,
      draft: {
        eligible: [],
        almost: [],
        recommendedProgramId: null,
        planSummary: 'Test',
        outcome: { eligible: [], almost: [], evaluated: [] },
        tokensIn: 0,
        tokensOut: 0,
        llmUsed: false,
      },
      eligiblePrograms: [],
      plan: { headline: 'x', summary: 'x', recommendedProgram: null, nextSteps: [] },
      evidencePack: {},
    });
    const approved = await approveFundingOutreach(db, { outreachId: created.id, approverUserId: 'x' });
    const shared = await shareFundingOutreach(db, { outreachId: approved.id });
    const link = await db.shareLink.findUnique({ where: { id: shared.shareLinkId! } });
    // Force-expire the link
    await db.shareLink.update({
      where: { id: link!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(getUnderwritingProfile(db, link!.token)).rejects.toBeInstanceOf(ShareLinkInvalidError);
  }, 60_000);
});

describe('buildEvidencePack (pure)', () => {
  it('returns a structured object with no invented numbers', () => {
    const pack = buildEvidencePack({
      organizationId: 'org1',
      analysisId: 'a1',
      assessment: {
        score: 75,
        band: 'healthy',
        pillars: [{
          id: 'cashflow', label: 'Cash Flow', maxPoints: 25, points: 19.3,
          metrics: [{ id: 'cashflow.positivity', label: 'Positivity', value: 0.92, contribution: 7.3, explanation: '11/12 months positive' }],
        }],
        anomalies: { returnedPayments: 0, overdraftDays: 0, structuralBreaks: 0, rapidDeteriorationDetected: false, details: [] },
        monthly: [{
          yearMonth: '2025-07',
          inflow: { amountMinor: 1970664n, currency: 'XCD' },
          outflow: { amountMinor: -1723113n, currency: 'XCD' },
          netFlow: { amountMinor: 247551n, currency: 'XCD' },
          balanceEnd: { amountMinor: 2089551n, currency: 'XCD' },
        }],
        periodStart: '2025-07-01',
        periodEnd: '2026-06-29',
      },
      profile: { country: 'AG', sector: 'tourism', monthsInOperation: 24, annualRevenue: { amount: 500000, currency: 'USD' } },
      draft: {
        eligible: [],
        almost: [],
        recommendedProgramId: 'cdb-lc-msme',
        planSummary: 'Test plan',
        outcome: { eligible: [], almost: [], evaluated: [] },
        tokensIn: 0,
        tokensOut: 0,
        llmUsed: false,
      },
      generatedAt: '2026-08-18T00:00:00.000Z',
    });
    expect((pack as any).organization.id).toBe('org1');
    expect((pack as any).analysis.score).toBe(75);
    expect((pack as any).analysis.pillars[0].metrics[0].value).toBe(0.92);
    expect((pack as any).analysis.monthly[0].netFlow).toBe(2475.51);
    expect((pack as any).funding.recommendedProgram).toBe('cdb-lc-msme');
  });
});
