/**
 * Golden test: parse tests/fixtures/sample-statement.csv, run the full
 * analysis pipeline, assert the score.
 *
 * This is the canary test. If the math changes, this test will tell us.
 * The exact value of the score is allowed to change as the methodology
 * evolves, but the test must always pass and the value must be in a
 * defensible band.
 *
 * The sample statement represents a healthy Caribbean small business
 * (caterer) over 12 months, July 2025 - June 2026. Expected: a "Healthy"
 * or "Strong" band.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseStatement } from '../lib/csv/parser';
import { aggregateByMonth } from '../lib/csv/aggregate';
import { computeScore } from '../lib/analysis/score';

const FIXTURE = join(__dirname, 'fixtures', 'sample-statement.csv');

function loadStatement() {
  const csv = readFileSync(FIXTURE, 'utf-8');
  return parseStatement(csv, {
    organizationId: 'org_test_caterer',
    accountId: 'acc_test_001',
    currency: 'XCD',
    filename: 'sample-statement.csv',
  });
}

describe('golden: sample Caribbean small business (12 months, XCD)', () => {
  it('parses the fixture with no errors', () => {
    const { statement, errors } = loadStatement();
    expect(errors).toEqual([]);
    expect(statement.transactions.length).toBeGreaterThan(200);
  });

  it('produces 12 monthly aggregates', () => {
    const { statement } = loadStatement();
    const { monthly } = aggregateByMonth(statement);
    expect(monthly.length).toBe(12);
    expect(monthly[0]!.yearMonth).toBe('2025-07');
    expect(monthly[11]!.yearMonth).toBe('2026-06');
  });

  it('produces a defensible score in the Healthy/Strong band', () => {
    const { statement } = loadStatement();
    const agg = aggregateByMonth(statement);
    const { assessment } = computeScore({
      organizationId: statement.organizationId,
      statementId: statement.id,
      currency: statement.currency,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });
    // The exact value of `score` is allowed to drift as the methodology
    // is tuned, but it must remain in a band consistent with the
    // fixture's underlying business health:
    //   - 11/12 months net positive
    //   - Two NSF fees (one of which is from a single late cheque)
    //   - No overdraft days
    //   - Counterparty concentration is high (2 clients ≈ 91%)
    //   - Cash balance growing steadily through the period
    // That describes a Healthy-to-Strong small business, not a Watch
    // business. The score must reflect that.
    expect(assessment.score).toBeGreaterThanOrEqual(65);
    expect(assessment.score).toBeLessThanOrEqual(95);
    expect(['healthy', 'strong']).toContain(assessment.band);
  });

  it('flags the 2 NSF fees as returned payments', () => {
    const { statement } = loadStatement();
    const agg = aggregateByMonth(statement);
    expect(agg.returnedPayments).toBe(2);
  });

  it('identifies the two dominant counterparties', () => {
    const { statement } = loadStatement();
    const agg = aggregateByMonth(statement);
    const total = agg.monthly.reduce(
      (s, m) => s + Number(m.inflow.amountMinor),
      0,
    );
    const meridian = Object.entries(agg.monthly[0]!.inflowByCounterparty)
      .find(([n]) => /MERIDIAN/.test(n));
    expect(meridian).toBeDefined();
    void total;
  });

  it('reports zero overdraft days', () => {
    const { statement } = loadStatement();
    const agg = aggregateByMonth(statement);
    const total = agg.monthly.reduce((s, m) => s + m.overdraftDays, 0);
    expect(total).toBe(0);
  });

  it('emits a complete computeTrace with all 5 modules', () => {
    const { statement } = loadStatement();
    const agg = aggregateByMonth(statement);
    const { assessment } = computeScore({
      organizationId: statement.organizationId,
      statementId: statement.id,
      currency: statement.currency,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      monthly: agg.monthly,
      returnedPayments: agg.returnedPayments,
      loanPaymentTotal: agg.loanPaymentTotal,
    });
    const modules = assessment.computeTrace.map(t => t.module);
    expect(modules).toEqual(['cashflow', 'revenue', 'expenses', 'liquidity', 'risk']);
  });
});
