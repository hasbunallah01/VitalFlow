/**
 * CSV bank statement parser for VitalFlow.
 *
 * MVP scope: just enough to parse the sample statement and the formats
 * used by the three biggest Caribbean banks (CIBC FirstCaribbean, Scotiabank,
 * Royal Bank of Trinidad). The format is detected by column headers and
 * the date format is detected from the first few data rows.
 *
 * Output: a Statement (types/transaction.ts) holding raw Transactions.
 * Higher-level analysis (categorization, monthly aggregation) lives in
 * lib/csv/aggregate.ts.
 *
 * Determinism rule: never throw on a per-row error — record it as a
 * `parseError` and keep going. A bad row should not abort the whole
 * statement.
 */

import type {
  ColumnMapping,
  DateFormatHint,
  Statement,
  Transaction,
} from '../../types/transaction';
import type { CurrencyCode, ISODate, Money } from '../../types/money';
import { fromMajor, zero } from '../analysis/money';

export interface ParseError {
  rowIndex: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  statement: Statement;
  errors: ParseError[];
}

interface RawRow {
  [key: string]: string;
}

/** Simple CSV parser: handles quoted fields with commas, no escapes. */
export function parseCsv(text: string): { headers: string[]; rows: RawRow[] } {
  // Normalize line endings
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]!).map(h => h.trim());
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    if (cells.length === 0) continue;
    const row: RawRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = cells[j] ?? '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === ',' && !inQuote) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Heuristic column detection. Returns null if the headers don't look
 * like a bank statement.
 */
export function detectColumnMapping(headers: ReadonlyArray<string>): ColumnMapping | null {
  const lower = headers.map(h => h.toLowerCase().trim());
  const find = (...needles: string[]): string | undefined => {
    for (const n of needles) {
      const hit = lower.find(h => h === n || h.includes(n));
      if (hit) return headers[lower.indexOf(hit)];
    }
    return undefined;
  };
  const date = find('txn date', 'date', 'transaction date', 'posting date');
  const narrative = find('narrative', 'description', 'details', 'memo', 'particulars');
  const withdrawal = find('withdrawal', 'debit', 'amount out', 'out');
  const deposit = find('deposit', 'credit', 'amount in', 'in');
  const balanceAfter = find('running bal', 'balance', 'running balance', 'closing bal');
  if (!date || !narrative || !withdrawal || !deposit) return null;
  return {
    date,
    narrative,
    withdrawal,
    deposit,
    balanceAfter,
  };
}

/** Heuristic date format detection. Tries a few options. */
export function detectDateFormat(samples: ReadonlyArray<string>): DateFormatHint {
  for (const s of samples) {
    const t = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return 'ISO_DASH';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
      // Disambiguate DMY vs MDY by looking at first component
      const [a, b] = t.split('/').map(Number);
      if (a !== undefined && b !== undefined) {
        if (a > 12) return 'DMY_SLASH'; // 25/03/2024 — must be DMY
        if (b > 12) return 'MDY_SLASH'; // 03/25/2024 — must be MDY
        // Ambiguous — default to DMY (Caribbean convention)
        return 'DMY_SLASH';
      }
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(t)) return 'DMY_DASH';
  }
  return 'DMY_SLASH';
}

function parseDate(s: string, format: DateFormatHint): ISODate | null {
  const t = s.trim();
  let day: number, month: number, year: number;
  if (format === 'ISO_DASH') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!m) return null;
    year = Number(m[1]); month = Number(m[2]); day = Number(m[3]);
  } else if (format === 'DMY_SLASH' || format === 'DMY_DASH') {
    const sep = format === 'DMY_SLASH' ? '/' : '-';
    const m = new RegExp(`^(\\d{1,2})${sep}(\\d{1,2})${sep}(\\d{4})$`).exec(t);
    if (!m) return null;
    day = Number(m[1]); month = Number(m[2]); year = Number(m[3]);
  } else { // MDY_SLASH
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
    if (!m) return null;
    month = Number(m[1]); day = Number(m[2]); year = Number(m[3]);
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseAmount(s: string): number {
  const t = s.trim();
  if (t.length === 0) return 0;
  // Handle commas as thousands separators and parentheses as negative
  let neg = false;
  let body = t;
  if (body.startsWith('(') && body.endsWith(')')) {
    neg = true;
    body = body.slice(1, -1);
  }
  body = body.replace(/,/g, '');
  const n = Number(body);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

function sha256Hex(input: string): string {
  // Node's crypto is available in our test/runtime. For pure portability
  // we use a tiny inline impl. Not for production crypto — for content
  // hashing and dedup only.
  // (Real impl below uses Node's crypto via dynamic import.)
  return require('crypto').createHash('sha256').update(input).digest('hex');
}

export interface ParseOptions {
  organizationId: string;
  accountId: string;
  currency: CurrencyCode;
  /** Optional explicit mapping. If absent, detectColumnMapping is used. */
  columnMapping?: ColumnMapping;
  /** Optional explicit date format. If absent, detectDateFormat is used. */
  dateFormat?: DateFormatHint;
  /** Source filename, for traceability. */
  filename: string;
}

export function parseStatement(
  csvText: string,
  options: ParseOptions,
): ParseResult {
  const { headers, rows } = parseCsv(csvText);
  const mapping = options.columnMapping ?? detectColumnMapping(headers);
  if (!mapping) {
    return {
      statement: emptyStatement(options, headers),
      errors: [{ rowIndex: -1, raw: headers.join(','), reason: 'No recognizable bank-statement header layout' }],
    };
  }
  const dateFormat = options.dateFormat ?? detectDateFormat(
    rows.slice(0, 5).map(r => r[mapping.date] ?? '').filter(Boolean),
  );
  const errors: ParseError[] = [];
  const transactions: Transaction[] = [];
  const statementId = `stmt_${sha256Hex(csvText).slice(0, 12)}`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const dateStr = r[mapping.date] ?? '';
    const narrStr = r[mapping.narrative] ?? '';
    const wRaw = r[mapping.withdrawal] ?? '';
    const dRaw = r[mapping.deposit] ?? '';
    const balRaw = mapping.balanceAfter ? (r[mapping.balanceAfter] ?? '') : '';
    const date = parseDate(dateStr, dateFormat);
    if (!date) {
      errors.push({ rowIndex: i, raw: dateStr, reason: 'Unparseable date' });
      continue;
    }
    const w = parseAmount(wRaw);
    const dep = parseAmount(dRaw);
    if (w === 0 && dep === 0) {
      // Skip empty rows (totals, blank lines masquerading as rows)
      continue;
    }
    const amount: Money = w > 0
      ? fromMajor((-w).toFixed(2), options.currency) // withdrawal = outflow = negative
      : fromMajor(dep.toFixed(2), options.currency);
    const bal = balRaw ? parseAmount(balRaw) : NaN;
    const balanceAfterMinor = Number.isFinite(bal) ? BigInt(Math.round(bal * 100)) : undefined;
    const id = `tx_${sha256Hex(`${statementId}:${i}:${date}:${w}:${dep}:${narrStr}`).slice(0, 16)}`;
    transactions.push({
      id,
      date,
      narrative: narrStr.trim(),
      amount,
      balanceAfterMinor,
      sourceRowIndex: i,
    });
  }
  transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sourceRowIndex - b.sourceRowIndex));
  const periodStart = transactions[0]?.date ?? ('1970-01-01' as ISODate);
  const periodEnd = transactions[transactions.length - 1]?.date ?? ('1970-01-01' as ISODate);
  return {
    statement: {
      id: statementId,
      organizationId: options.organizationId,
      accountId: options.accountId,
      transactions,
      periodStart,
      periodEnd,
      currency: options.currency,
      columnMapping: mapping,
      dateFormat,
      sourceHash: sha256Hex(csvText),
      sourceFilename: options.filename,
    },
    errors,
  };
}

function emptyStatement(options: ParseOptions, headers: ReadonlyArray<string>): Statement {
  return {
    id: 'empty',
    organizationId: options.organizationId,
    accountId: options.accountId,
    transactions: [],
    periodStart: '1970-01-01' as ISODate,
    periodEnd: '1970-01-01' as ISODate,
    currency: options.currency,
    columnMapping: { date: '', narrative: '', withdrawal: '', deposit: '' },
    dateFormat: 'DMY_SLASH',
    sourceHash: '',
    sourceFilename: options.filename,
  };
  // suppress unused-param warning by referencing
  void headers;
  void zero;
}
