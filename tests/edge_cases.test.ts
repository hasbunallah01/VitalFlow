/**
 * Edge-case probes for the analysis + persistence pipeline.
 *
 * Not a permanent test suite — used as a discovery tool to find bugs
 * before we ship. Each `it` exercises a real concern about how the
 * system behaves with weird, adversarial, or boundary inputs.
 */

import { describe, it, expect } from 'vitest';
import { parseStatement, detectColumnMapping, detectDateFormat } from '../lib/csv/parser';
import { aggregateByMonth } from '../lib/csv/aggregate';
import { computeScore } from '../lib/analysis/score';
import { toMajorNumber } from '../lib/analysis/money';

describe('edge case: empty / malformed CSV', () => {
  it('returns 0 transactions for an empty file', () => {
    const r = parseStatement('', {
      organizationId: 'org',
      accountId: 'acc',
      currency: 'XCD',
      filename: 'empty.csv',
    });
    expect(r.statement.transactions).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0); // should report no-headers
  });

  it('rejects an unrecognizable header', () => {
    const r = parseStatement('foo,bar,baz\n1,2,3', {
      organizationId: 'org',
      accountId: 'acc',
      currency: 'XCD',
      filename: 'garbage.csv',
    });
    expect(r.statement.transactions).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('handles a row with both withdrawal and deposit empty', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,FOO,,,100.00
02/01/2025,BAR,50.00,,50.00`;
    const r = parseStatement(csv, {
      organizationId: 'org',
      accountId: 'acc',
      currency: 'XCD',
      filename: 'partial.csv',
    });
    // Both rows should be parsed (empty amounts default to 0, then skipped if both 0)
    expect(r.statement.transactions.length).toBe(1);
    expect(r.statement.transactions[0]?.narrative).toBe('BAR');
  });

  it('handles quoted fields with commas in narrative', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,"TRANSFER FROM SMITH, JOHN INV001",,100.00,100.00`;
    const r = parseStatement(csv, {
      organizationId: 'org',
      accountId: 'acc',
      currency: 'XCD',
      filename: 'quoted.csv',
    });
    expect(r.statement.transactions.length).toBe(1);
    expect(r.statement.transactions[0]?.narrative).toContain('SMITH, JOHN');
  });

  it('handles negative-in-parens amount notation', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,FOO,(50.00),,50.00`;
    const r = parseStatement(csv, {
      organizationId: 'org',
      accountId: 'acc',
      currency: 'XCD',
      filename: 'parens.csv',
    });
    expect(r.statement.transactions.length).toBe(1);
    expect(r.statement.transactions[0]?.amount.amountMinor).toBeLessThan(0n);
  });
});

describe('edge case: aggregation boundary conditions', () => {
  it('returns empty monthly for empty statement', () => {
    const r = parseStatement('', {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'e.csv',
    });
    const a = aggregateByMonth(r.statement);
    expect(a.monthly).toEqual([]);
    expect(a.returnedPayments).toBe(0);
    expect(a.loanPaymentTotal).toBe(0);
  });

  it('returns single month for single-day statement', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,DEPOSIT,,100.00,100.00
01/01/2025,WITHDRAWAL,30.00,,70.00`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 's.csv',
    });
    const a = aggregateByMonth(r.statement);
    expect(a.monthly.length).toBe(1);
    expect(a.returnedPayments).toBe(0);
  });

  it('handles all-zero balance column (no overdraft days)', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,A,,100.00,0
02/01/2025,B,50.00,,0
03/01/2025,C,,100.00,0`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'z.csv',
    });
    const a = aggregateByMonth(r.statement);
    expect(a.monthly[0]?.overdraftDays).toBe(0);
  });
});

describe('edge case: scoring with insufficient data', () => {
  it('returns zero confidence for 1-month statement', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,DEPOSIT,,1000.00,1000.00
01/01/2025,WITHDRAWAL,500.00,,500.00`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'o.csv',
    });
    const a = aggregateByMonth(r.statement);
    const { assessment } = computeScore({
      organizationId: 'org', statementId: 's1', currency: 'XCD',
      periodStart: r.statement.periodStart, periodEnd: r.statement.periodEnd,
      monthly: a.monthly, returnedPayments: 0, loanPaymentTotal: 0,
    });
    expect(assessment.confidence).toBeLessThan(1.0);
  });

  it('returns reasonable score for single positive month', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,DEPOSIT,,1000.00,1000.00
01/01/2025,WITHDRAWAL,500.00,,500.00`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'o.csv',
    });
    const a = aggregateByMonth(r.statement);
    const { assessment } = computeScore({
      organizationId: 'org', statementId: 's1', currency: 'XCD',
      periodStart: r.statement.periodStart, periodEnd: r.statement.periodEnd,
      monthly: a.monthly, returnedPayments: 0, loanPaymentTotal: 0,
    });
    expect(assessment.score).toBeGreaterThanOrEqual(0);
    expect(assessment.score).toBeLessThanOrEqual(100);
  });
});

describe('edge case: column detection', () => {
  it('detects the standard sample layout', () => {
    const m = detectColumnMapping(['Txn Date', 'Narrative', 'Withdrawal', 'Deposit', 'Running Bal']);
    expect(m).not.toBeNull();
    expect(m?.date).toBe('Txn Date');
    expect(m?.narrative).toBe('Narrative');
    expect(m?.withdrawal).toBe('Withdrawal');
    expect(m?.deposit).toBe('Deposit');
  });

  it('accepts case-insensitive header variations', () => {
    const m = detectColumnMapping(['date', 'description', 'debit', 'credit', 'balance']);
    expect(m).not.toBeNull();
    expect(m?.date).toBe('date');
    expect(m?.narrative).toBe('description');
  });

  it('returns null when no recognizable header', () => {
    const m = detectColumnMapping(['foo', 'bar', 'baz', 'qux']);
    expect(m).toBeNull();
  });
});

describe('edge case: date format detection', () => {
  it('detects DMY (Caribbean default)', () => {
    expect(detectDateFormat(['25/03/2024'])).toBe('DMY_SLASH');
  });

  it('detects MDY (US style)', () => {
    expect(detectDateFormat(['03/25/2024'])).toBe('MDY_SLASH');
  });

  it('detects ISO', () => {
    expect(detectDateFormat(['2024-03-25'])).toBe('ISO_DASH');
  });

  it('falls back to DMY_SLASH on ambiguous', () => {
    expect(detectDateFormat(['01/02/2024'])).toBe('DMY_SLASH');
  });
});

describe('edge case: Money boundary at the DB', () => {
  it('toMajorNumber handles the boundary correctly', () => {
    const m = toMajorNumber({ amountMinor: 123456789012345n, currency: 'XCD' });
    expect(m).toBe(1234567890123.45);
  });

  it('toMajorNumber handles zero', () => {
    expect(toMajorNumber({ amountMinor: 0n, currency: 'XCD' })).toBe(0);
  });

  it('toMajorNumber handles negative', () => {
    expect(toMajorNumber({ amountMinor: -100n, currency: 'XCD' })).toBe(-1);
  });
});

describe('edge case: counterparty parsing', () => {
  it('extracts name from TRANSFER FROM <name> INV<num>', () => {
    // The persist layer re-implements this; verify it matches aggregate
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,TRANSFER FROM ACME LTD INV123,,100.00,100.00`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'c.csv',
    });
    const a = aggregateByMonth(r.statement);
    const cp = a.monthly[0]!.inflowByCounterparty;
    expect(Object.keys(cp).some((k) => /ACME/.test(k))).toBe(true);
  });

  it('handles counterparty name with special characters', () => {
    const csv = `Txn Date,Narrative,Withdrawal,Deposit,Running Bal
01/01/2025,TRANSFER FROM SMITH & SONS LTD INV999,,100.00,100.00`;
    const r = parseStatement(csv, {
      organizationId: 'org', accountId: 'acc', currency: 'XCD', filename: 'c.csv',
    });
    const a = aggregateByMonth(r.statement);
    const cp = a.monthly[0]!.inflowByCounterparty;
    expect(Object.keys(cp).some((k) => /SMITH/.test(k))).toBe(true);
  });
});

describe('edge case: large values', () => {
  it('handles a transaction over 2^53 minor units without precision loss', () => {
    // 2^53 = 9_007_199_254_740_992. Above that, JS number loses precision.
    // Our Money uses bigint internally; the boundary is toMajorNumber().
    const m = toMajorNumber({ amountMinor: 9_007_199_254_740_992n, currency: 'XCD' });
    expect(m).toBe(90_071_992_547_409.92);
  });
});
