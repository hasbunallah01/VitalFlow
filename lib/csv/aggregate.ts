/**
 * Aggregates a Statement into MonthlyAggregate[].
 *
 * Categorization is a simple keyword heuristic — for the MVP. Phase 2
 * replaces this with an LLM-assisted classifier (with the LLM only
 * allowed to CHOOSE from a fixed category set, never to invent one).
 *
 * The categorization rules are deliberately conservative: when in doubt,
 * category is "other". This keeps the math explainable and auditable.
 */

import type { Transaction, Statement } from '../../types/transaction';
import type {
  ExpenseCategory,
  MonthlyAggregate,
} from '../../types/analysis';
import { EXPENSE_CATEGORIES } from '../../types/analysis';
import type { ISODate, Money } from '../../types/money';
import { fromMajor, zero, add, sub } from '../analysis/money';

const CURRENCY = (m: Money) => m.currency;

function categorize(narrative: string): ExpenseCategory | 'inflow' {
  const n = narrative.toUpperCase();
  if (n.includes('STANDING ORDER RENT') || n.includes('RENT -')) return 'rent';
  if (n.includes('SALARY') || n.includes('PAYROLL')) return 'salaries';
  if (n.includes('UTILITY') || n.includes('LIGHT & POWER') || n.includes('WATER')) return 'utilities';
  if (n.includes('FUEL STATION')) return 'fuel';
  if (n.includes('CATERING SUPPLIES') || n.includes('ISLAND FOOD') || n.includes('PACKAGING') || n.includes('WHOLESALE')) return 'suppliers';
  if (n.includes('LOAN') || n.includes('MORTGAGE')) return 'loan_payment';
  if (n.includes('SUBSCRIPTION') || n.includes('DD SUBSCRIPTION')) return 'subscriptions';
  if (n.includes('NSF') || n.includes('RETURNED ITEM') || n.includes('BANK FEE') || n.includes('SERVICE CHARGE')) return 'fees';
  if (n.includes('TRANSFER FROM') || n.includes('DEPOSIT')) return 'inflow';
  return 'other';
}

function counterpartyName(narrative: string): string | null {
  const n = narrative.trim();
  const m = /^TRANSFER FROM (.+?)(?:\s+INV\d+)?$/i.exec(n);
  if (m) return m[1]!.trim();
  if (/^STANDING ORDER FROM (.+)$/i.test(n)) {
    return n.replace(/^STANDING ORDER FROM /i, '').trim();
  }
  return null;
}

function monthKey(date: ISODate): string {
  return date.slice(0, 7); // 'YYYY-MM'
}

function monthStart(ym: string): ISODate {
  return `${ym}-01` as ISODate;
}

export interface AggregateOptions {
  currency: string;
}

export function aggregateByMonth(
  statement: Statement,
): {
  monthly: MonthlyAggregate[];
  returnedPayments: number;
  loanPaymentTotal: number;
  /** Total inflow over the period. */
  totalInflow: number;
  /** Total outflow over the period. */
  totalOutflow: number;
} {
  const buckets = new Map<string, {
    inflow: Money;
    outflow: Money;
    outflowByCategory: Map<ExpenseCategory, Money>;
    inflowByCounterparty: Map<string, Money>;
    overdraftDays: Set<number>;
    balanceEnd?: Money;
  }>();

  let returnedPayments = 0;
  let loanPaymentTotal = 0;

  for (const tx of statement.transactions) {
    if (CURRENCY(tx.amount) !== statement.currency) {
      // Skip mismatched-currency rows; the analysis layer can't mix them.
      continue;
    }
    const ym = monthKey(tx.date);
    let b = buckets.get(ym);
    if (!b) {
      b = {
        inflow: zero(statement.currency),
        outflow: zero(statement.currency),
        outflowByCategory: new Map(),
        inflowByCounterparty: new Map(),
        overdraftDays: new Set(),
      };
      buckets.set(ym, b);
    }
    if (tx.amount.amountMinor > 0n) {
      b.inflow = add(b.inflow, tx.amount);
      const cp = counterpartyName(tx.narrative);
      if (cp) {
        const prev = b.inflowByCounterparty.get(cp) ?? zero(statement.currency);
        b.inflowByCounterparty.set(cp, add(prev, tx.amount));
      }
    } else if (tx.amount.amountMinor < 0n) {
      b.outflow = add(b.outflow, tx.amount);
      const cat = categorize(tx.narrative);
      if (cat !== 'inflow') {
        const prev = b.outflowByCategory.get(cat) ?? zero(statement.currency);
        b.outflowByCategory.set(cat, add(prev, tx.amount));
        if (cat === 'loan_payment') {
          loanPaymentTotal += Number(-tx.amount.amountMinor) / 100;
        }
        if (cat === 'fees' && /NSF|RETURNED ITEM/i.test(tx.narrative)) {
          returnedPayments += 1;
        }
      }
    }
    if (tx.balanceAfterMinor !== undefined && tx.balanceAfterMinor < 0n) {
      const day = Number(tx.date.slice(8, 10));
      b.overdraftDays.add(day);
    }
    // Track the latest balance for the month as balanceEnd
    b.balanceEnd = fromMajor((Number(tx.balanceAfterMinor ?? 0n) / 100).toFixed(2), statement.currency);
  }

  const monthly: MonthlyAggregate[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort();
  for (const ym of sortedKeys) {
    const b = buckets.get(ym)!;
    const outflowByCategory: Record<ExpenseCategory, Money> = {
      rent: zero(statement.currency),
      salaries: zero(statement.currency),
      utilities: zero(statement.currency),
      suppliers: zero(statement.currency),
      fuel: zero(statement.currency),
      subscriptions: zero(statement.currency),
      loan_payment: zero(statement.currency),
      fees: zero(statement.currency),
      other: zero(statement.currency),
    };
    for (const k of EXPENSE_CATEGORIES) {
      const v = b.outflowByCategory.get(k);
      if (v) outflowByCategory[k] = v;
    }
    const inflowByCounterparty: Record<string, Money> = {};
    for (const [name, m] of b.inflowByCounterparty) inflowByCounterparty[name] = m;

    monthly.push({
      yearMonth: ym,
      monthStart: monthStart(ym),
      inflow: b.inflow,
      outflow: b.outflow,
      netFlow: add(b.inflow, b.outflow), // outflow is already negative
      balanceEnd: b.balanceEnd,
      outflowByCategory,
      inflowByCounterparty,
      overdraftDays: b.overdraftDays.size,
    });
  }

  // Suppress unused-import warning
  void sub;

  const totalInflow = monthly.reduce(
    (s, m) => s + Number(m.inflow.amountMinor),
    0,
  ) / 100;
  const totalOutflow = monthly.reduce(
    (s, m) => s + Number(-m.outflow.amountMinor),
    0,
  ) / 100;

  return {
    monthly,
    returnedPayments,
    loanPaymentTotal,
    totalInflow,
    totalOutflow,
  };
}
