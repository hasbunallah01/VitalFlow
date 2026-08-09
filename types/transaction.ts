/**
 * Transaction — the atomic unit of a bank statement.
 * See docs/DATA_MODEL.md.
 *
 * One row from a CSV bank statement. Amounts are ALWAYS integer minor units
 * (BigInt). Currency is ALWAYS set. Narrative is the raw text from the bank;
 * classification happens at analysis time, not at parse time.
 */

import type { CurrencyCode, ISODate, Money } from './money';

/**
 * Raw row as produced by the CSV parser. One-to-one with a CSV data row.
 * We do NOT classify or summarize here; that happens in lib/analysis/*.
 */
export interface Transaction {
  /** Stable id for this analysis. SHA-256 of (analysisId + rowIndex + date + amount + narrative). */
  readonly id: string;
  readonly date: ISODate;
  readonly narrative: string;
  /**
   * Signed Money for the transaction. Positive = deposit (inflow to the
   * business account), negative = withdrawal (outflow from the business
   * account). Exactly one of |debitMinor| and |creditMinor| is non-zero.
   *
   * Stored as a single signed Money (not two columns) so the math modules
   * never have to choose between two fields. Parser responsibility is to
   * produce the correct sign.
   */
  readonly amount: Money;
  /**
   * Optional balance snapshot AFTER the transaction. The CSV provides
   * "Running Bal" in the sample. Stored as unsigned major units (e.g.
   * 16020.00) for compatibility with the sample format. Used for
   * sanity-checking the parser and for "days cash on hand" estimates.
   * BigInt minor units when present.
   */
  readonly balanceAfterMinor?: bigint;
  /** 0-indexed row number in the source CSV (header excluded). */
  readonly sourceRowIndex: number;
}

/**
 * A bank's export header → field mapping, supplied either by an explicit
 * ColumnMapping (the user told us) or by the heuristic in
 * lib/csv/detect-columns.ts. Keeping it as data (not buried in code) means
 * we can persist it on the Statement record and re-parse later.
 */
export interface ColumnMapping {
  date: string;
  narrative: string;
  /** Withdrawal / debit column. Outflows are positive numbers in the CSV. */
  withdrawal: string;
  /** Deposit / credit column. Inflows are positive numbers in the CSV. */
  deposit: string;
  /** Optional running balance column. */
  balanceAfter?: string;
}

export type DateFormatHint =
  /** 31/12/2025 — most Caribbean banks. */
  | 'DMY_SLASH'
  /** 12/31/2025 — US-style. */
  | 'MDY_SLASH'
  /** 2025-12-31 — ISO. */
  | 'ISO_DASH'
  /** 31-12-2025 — some older systems. */
  | 'DMY_DASH';

export interface Statement {
  readonly id: string;
  /** The business this statement belongs to. */
  readonly organizationId: string;
  /** The account this statement covers. */
  readonly accountId: string;
  /** All transactions in chronological order. */
  readonly transactions: ReadonlyArray<Transaction>;
  /** Earliest transaction date. */
  readonly periodStart: ISODate;
  /** Latest transaction date. */
  readonly periodEnd: ISODate;
  /** ISO currency code (e.g. 'XCD'). */
  readonly currency: CurrencyCode;
  /** The column mapping that produced this statement. Persisted for re-parse. */
  readonly columnMapping: ColumnMapping;
  /** Detected date format. */
  readonly dateFormat: DateFormatHint;
  /** SHA-256 of the raw CSV bytes. Used for dedup and audit. */
  readonly sourceHash: string;
  /** Original filename as uploaded. */
  readonly sourceFilename: string;
}
