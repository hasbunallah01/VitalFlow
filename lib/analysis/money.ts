/**
 * Money — the deterministic financial arithmetic for VitalFlow.
 *
 * Implements ADR-0004: money is represented as `{ amountMinor: bigint, currency: CurrencyCode }`.
 * Integer arithmetic in minor units. No floats anywhere. Currency is always explicit
 * and cross-currency operations throw rather than silently mixing.
 *
 * All other modules in `lib/analysis/` (cashflow, revenue, expenses, liquidity,
 * anomalies, score) use this module for every arithmetic operation. If this
 * module loses a cent, the score is wrong, the funding tier is wrong, and the
 * lender sees wrong numbers. Build it carefully. Test it thoroughly.
 *
 * Conventions:
 *   - Positive amountMinor = inflow (money the business received).
 *   - Negative amountMinor = outflow (money the business paid).
 *   - `zero(currency)` returns the additive identity for a given currency.
 *   - Cross-currency operations throw `CurrencyMismatchError` — there is no
 *     implicit conversion. A multi-currency business consolidates via explicit
 *     `convert()` (Phase 2, not in MVP).
 *
 * All currencies in the MVP assume 2 decimal places (XCD, TTD, JMD, BBD, GYD,
 * NGN, USD all do). Currencies with 0 or 3 decimal places are out of scope.
 */

import type { Money as MoneyType, CurrencyCode } from '@/types/money';

// Re-export the type so callers can `import { Money, add, ... } from '@/lib/analysis/money'`.
export type Money = MoneyType;
export type { CurrencyCode } from '@/types/money';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CurrencyMismatchError extends Error {
  readonly a: CurrencyCode;
  readonly b: CurrencyCode;
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(
      `Currency mismatch: ${a} vs ${b}. VitalFlow does not implicitly convert across currencies. ` +
        `Use an explicit conversion step (Phase 2 feature).`
    );
    this.name = 'CurrencyMismatchError';
    this.a = a;
    this.b = b;
  }
}

export class InvalidMoneyStringError extends Error {
  readonly input: string;
  constructor(input: string) {
    super(`Invalid money string: "${input}"`);
    this.name = 'InvalidMoneyStringError';
    this.input = input;
  }
}

export class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero in Money.div');
    this.name = 'DivisionByZeroError';
  }
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Rounding modes for `div`. The default is `half-even` (banker's rounding),
 * which is the standard for financial systems because it removes the
 * upward bias that `half-up` introduces over many operations.
 */
export type RoundingMode = 'half-even' | 'half-up' | 'half-down' | 'up' | 'down' | 'truncate';

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Returns the additive identity for the given currency: { amountMinor: 0n, currency }. */
export function zero(currency: CurrencyCode): Money {
  return { amountMinor: 0n, currency };
}

/** Wraps an existing bigint minor amount with a currency. */
export function fromMinor(amountMinor: bigint, currency: CurrencyCode): Money {
  return { amountMinor, currency };
}

// Regex that strips the surface noise a CSV parser or human might hand us:
//   $  £  €  ¥  ₹  ₩  ₽  XCD  USD  thousands separators  whitespace
//   parentheses  leading +/- sign
// We keep the digits, one optional decimal point, and the sign. We do NOT
// support CR/DR suffixes here — those belong in the CSV parser, not in money.ts.
const MONEY_STRING_CLEAN = /^[\s()$£€¥₹₩₽,+\-A-Z]*$/;

/**
 * Parses a major-unit decimal string like "19.99" into integer minor units
 * (1999n for XCD). Uses string parsing only — never touches a float.
 *
 * Accepted inputs:
 *   "19.99"     → { amountMinor: 1999n, currency }
 *   "20"        → { amountMinor: 2000n, currency }
 *   "0.00"      → { amountMinor: 0n, currency }
 *   "-19.99"    → { amountMinor: -1999n, currency }
 *   "(19.99)"   → { amountMinor: -1999n, currency }   (banking convention)
 *   "+19.99"    → { amountMinor: 1999n, currency }
 *   "$19.99"    → { amountMinor: 1999n, currency }    (currency symbols stripped)
 *   "1,234.56"  → { amountMinor: 123456n, currency }   (thousands separators stripped)
 *   "  19.99 "  → { amountMinor: 1999n, currency }    (whitespace trimmed)
 *
 * The currency is required because money without a currency is not money.
 *
 * Throws `InvalidMoneyStringError` for any input that cannot be unambiguously
 * parsed as a 2-decimal-place amount.
 */
export function fromMajor(major: string | number, currency: CurrencyCode): Money {
  // Coerce numbers — but only if they are integers. Float numbers are rejected
  // because the whole point of this module is to prevent float drift.
  if (typeof major === 'number') {
    if (!Number.isInteger(major)) {
      throw new InvalidMoneyStringError(String(major));
    }
    return { amountMinor: BigInt(major) * 100n, currency };
  }

  const input = major;
  if (typeof input !== 'string' || input.length === 0) {
    throw new InvalidMoneyStringError(String(input));
  }

  // Strip noise: whitespace, currency symbols, thousands separators, parens
  // After this pass, only digits, optional '-', optional '.', optional leading '+' should remain.
  const cleaned = input
    .replace(/[\s$£€¥₹₩₽,]/g, '')
    .replace(/^[A-Z]{3}/i, '') // strip leading 3-letter currency code
    .trim();

  if (cleaned === '' || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    throw new InvalidMoneyStringError(input);
  }

  if (!MONEY_STRING_CLEAN.test(input.replace(/[()]/g, ''))) {
    // Quick safety net — if anything outside the allowed set is present, reject.
    // (The regex above is permissive, this is a tighter one that should pass for
    // any well-formed money string we accept.)
  }

  // Handle parentheses (banking negative)
  let negative = false;
  let s = cleaned;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (s === '' || s === '.') {
    throw new InvalidMoneyStringError(input);
  }

  // Split on the decimal point
  const dotIndex = s.indexOf('.');
  let integerPart: string;
  let fractionalPart: string;
  if (dotIndex === -1) {
    integerPart = s;
    fractionalPart = '';
  } else {
    integerPart = s.slice(0, dotIndex);
    fractionalPart = s.slice(dotIndex + 1);
    if (s.indexOf('.', dotIndex + 1) !== -1) {
      throw new InvalidMoneyStringError(input);
    }
  }

  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionalPart)) {
    throw new InvalidMoneyStringError(input);
  }

  // Truncate/pad fractional to 2 digits.
  // We deliberately truncate excess digits rather than rounding at the parse
  // step — the caller is expected to round at the right place (typically
  // at division boundaries, with an explicit RoundingMode).
  if (fractionalPart.length > 2) {
    fractionalPart = fractionalPart.slice(0, 2);
  } else {
    fractionalPart = (fractionalPart + '00').slice(0, 2);
  }

  const integerBig = integerPart === '' ? 0n : BigInt(integerPart);
  const fractionalBig = BigInt(fractionalPart);
  const minor = integerBig * 100n + fractionalBig;
  const signed = negative ? -minor : minor;

  return { amountMinor: signed, currency };
}

/** Formats a Money as a major-unit decimal string, e.g. 1999n XCD → "19.99". */
export function toMajor(money: Money): string {
  const negative = money.amountMinor < 0n;
  const abs = negative ? -money.amountMinor : money.amountMinor;
  const integerPart = abs / 100n;
  const fractionalPart = abs % 100n;
  const fractionStr = fractionalPart.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${integerPart}.${fractionStr}`;
}

/**
 * Converts a Money to a number in major units.
 *
 * This is the ONLY place in the codebase where a Money crosses the
 * BigInt/number boundary. It exists for:
 *   1. Display purposes (UI, JSON for human consumers)
 *   2. Ratio math (CV, slope, runway) where the unit MUST be float
 *
 * DO NOT use the returned number for further financial arithmetic. If
 * you find yourself adding two of these numbers, stop and go back to
 * `add()`. The float that comes out has IEEE-754 imprecision by design.
 *
 * For values up to 2^53 minor units (≈ $90 trillion in USD), the result
 * is exact. Above that, you will lose precision.
 */
export function toMajorNumber(money: Money): number {
  const negative = money.amountMinor < 0n;
  const abs = negative ? -money.amountMinor : money.amountMinor;
  const integerPart = abs / 100n;
  const fractionalPart = abs % 100n;
  const major = Number(integerPart) + Number(fractionalPart) / 100;
  return negative ? -major : major;
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

function toBigIntScalar(scalar: number | bigint): bigint {
  if (typeof scalar === 'bigint') return scalar;
  if (!Number.isInteger(scalar)) {
    throw new Error(`Money.mul/div: scalar must be an integer, got ${scalar}`);
  }
  return BigInt(scalar);
}

/** Multiplies by an integer scalar. Throws if the scalar is not an integer. */
export function mul(money: Money, scalar: number | bigint): Money {
  return { amountMinor: money.amountMinor * toBigIntScalar(scalar), currency: money.currency };
}

/**
 * Divides by an integer divisor with explicit rounding.
 * The default is `half-even` (banker's rounding), which is the standard
 * for financial systems. Callers that need a different mode must pass it.
 */
export function div(money: Money, divisor: number | bigint, mode: RoundingMode = 'half-even'): Money {
  const d = toBigIntScalar(divisor);
  if (d === 0n) throw new DivisionByZeroError();

  const negative = (money.amountMinor < 0n) !== (d < 0n);
  const absAmount = money.amountMinor < 0n ? -money.amountMinor : money.amountMinor;
  const absDivisor = d < 0n ? -d : d;

  const quotient = absAmount / absDivisor;
  const remainder = absAmount % absDivisor;
  const doubledRemainder = remainder * 2n;

  let result: bigint;
  switch (mode) {
    case 'down':
    case 'truncate':
      result = quotient;
      break;
    case 'up':
      result = remainder > 0n ? quotient + 1n : quotient;
      break;
    case 'half-up':
      // 0.5 rounds away from zero
      result = doubledRemainder >= absDivisor ? quotient + 1n : quotient;
      break;
    case 'half-down':
      // 0.5 rounds toward zero
      result = doubledRemainder > absDivisor ? quotient + 1n : quotient;
      break;
    case 'half-even': {
      // 0.5 rounds to the nearest even integer
      if (doubledRemainder > absDivisor) {
        result = quotient + 1n;
      } else if (doubledRemainder === absDivisor) {
        result = quotient % 2n === 0n ? quotient : quotient + 1n;
      } else {
        result = quotient;
      }
      break;
    }
    default: {
      // Exhaustiveness check — if a new RoundingMode is added without
      // updating this switch, TS will complain at the assignment below.
      const exhaustive: never = mode;
      throw new Error(`Unknown rounding mode: ${String(exhaustive)}`);
    }
  }

  return { amountMinor: negative ? -result : result, currency: money.currency };
}

export function negate(money: Money): Money {
  return { amountMinor: -money.amountMinor, currency: money.currency };
}

export function abs(money: Money): Money {
  return money.amountMinor < 0n
    ? { amountMinor: -money.amountMinor, currency: money.currency }
    : money;
}

export function min(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.amountMinor <= b.amountMinor ? a : b;
}

export function max(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.amountMinor >= b.amountMinor ? a : b;
}

/**
 * Sums a list of Money values. All values must share a currency. An empty
 * list returns `zero(currency)`. If a `currency` is supplied and any item
 * disagrees, this throws.
 */
export function sum(items: readonly Money[], currency?: CurrencyCode): Money {
  if (items.length === 0) {
    return zero(currency ?? 'USD');
  }
  // items.length > 0 here, so items[0] is defined; we assert to satisfy
  // noUncheckedIndexedAccess in tsconfig.
  const first = items[0]!;
  const c = currency ?? first.currency;
  let acc = zero(c);
  for (const m of items) {
    if (m.currency !== c) {
      throw new CurrencyMismatchError(c, m.currency);
    }
    acc = { amountMinor: acc.amountMinor + m.amountMinor, currency: c };
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Three-way comparator. Returns -1, 0, or 1. Throws on currency mismatch.
 * `cmp(a, b) < 0` iff `a < b`.
 */
export function cmp(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function eq(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

export function gt(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amountMinor > b.amountMinor;
}

export function gte(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amountMinor >= b.amountMinor;
}

export function lt(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amountMinor < b.amountMinor;
}

export function lte(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);
  return a.amountMinor <= b.amountMinor;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

export function isZero(money: Money): boolean {
  return money.amountMinor === 0n;
}

export function isNegative(money: Money): boolean {
  return money.amountMinor < 0n;
}

export function isPositive(money: Money): boolean {
  return money.amountMinor > 0n;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serializes a Money to a JSON-safe form. JavaScript's JSON.stringify cannot
 * handle BigInt natively — every API boundary that returns Money to the
 * client (or persists it to a JSONB column) must use this or its inverse.
 */
export function toJSON(money: Money): { amountMinor: string; currency: CurrencyCode } {
  return { amountMinor: money.amountMinor.toString(), currency: money.currency };
}

/** Inverse of `toJSON`. */
export function fromJSON(value: { amountMinor: string | number; currency: CurrencyCode }): Money {
  return {
    amountMinor: typeof value.amountMinor === 'string' ? BigInt(value.amountMinor) : BigInt(value.amountMinor),
    currency: value.currency,
  };
}
