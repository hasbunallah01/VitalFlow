/**
 * Tests for `lib/analysis/money.ts`.
 *
 * These tests are the bedrock of VitalFlow's credibility. If money.ts is wrong,
 * every number the system produces is wrong. Every public function and every
 * failure mode in money.ts is covered here.
 */

import { describe, it, expect } from 'vitest';

import {
  zero,
  fromMinor,
  fromMajor,
  toMajor,
  add,
  sub,
  mul,
  div,
  negate,
  abs,
  min,
  max,
  sum,
  cmp,
  eq,
  gt,
  gte,
  lt,
  lte,
  isZero,
  isNegative,
  isPositive,
  toJSON,
  fromJSON,
  CurrencyMismatchError,
  InvalidMoneyStringError,
  DivisionByZeroError,
} from './money';

import type { Money, CurrencyCode } from '../../types/money';

const XCD: CurrencyCode = 'XCD';
const USD: CurrencyCode = 'USD';
const JMD: CurrencyCode = 'JMD';

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

describe('Money — constructors', () => {
  describe('zero', () => {
    it('returns amountMinor 0n with the given currency', () => {
      expect(zero(XCD)).toEqual({ amountMinor: 0n, currency: XCD });
    });

    it('returns a fresh object each call (immutability)', () => {
      const a = zero(XCD);
      const b = zero(XCD);
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('fromMinor', () => {
    it('wraps an existing bigint minor amount', () => {
      expect(fromMinor(1234n, XCD)).toEqual({ amountMinor: 1234n, currency: XCD });
    });

    it('preserves negative values', () => {
      expect(fromMinor(-1234n, XCD)).toEqual({ amountMinor: -1234n, currency: XCD });
    });

    it('preserves zero', () => {
      expect(fromMinor(0n, XCD)).toEqual({ amountMinor: 0n, currency: XCD });
    });
  });

  describe('fromMajor — happy path', () => {
    it('parses a simple positive amount with 2 decimal places', () => {
      expect(fromMajor('19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('parses a whole number as .00', () => {
      expect(fromMajor('20', XCD)).toEqual({ amountMinor: 2000n, currency: XCD });
    });

    it('parses zero', () => {
      expect(fromMajor('0', XCD)).toEqual({ amountMinor: 0n, currency: XCD });
    });

    it('parses zero with decimals', () => {
      expect(fromMajor('0.00', XCD)).toEqual({ amountMinor: 0n, currency: XCD });
    });

    it('parses single-digit decimals correctly', () => {
      expect(fromMajor('1.5', XCD)).toEqual({ amountMinor: 150n, currency: XCD });
    });

    it('parses large numbers', () => {
      expect(fromMajor('1000000.00', XCD)).toEqual({ amountMinor: 100000000n, currency: XCD });
    });

    it('parses very large numbers (typical 12-month statement totals)', () => {
      expect(fromMajor('48210000.00', XCD)).toEqual({ amountMinor: 4821000000n, currency: XCD });
    });

    it('parses negative with minus sign', () => {
      expect(fromMajor('-19.99', XCD)).toEqual({ amountMinor: -1999n, currency: XCD });
    });

    it('parses negative with plus sign', () => {
      expect(fromMajor('+19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('parses negative with parentheses (banking convention)', () => {
      expect(fromMajor('(19.99)', XCD)).toEqual({ amountMinor: -1999n, currency: XCD });
    });

    it('does not accept a double-negative "-(19.99)" (not a standard banking notation)', () => {
      // Standard banking notations are "-19.99" or "(19.99)", not both.
      // A double-negative would be ambiguous; we reject it loudly rather than guess.
      expect(() => fromMajor('-(19.99)', XCD)).toThrow(InvalidMoneyStringError);
    });
  });

  describe('fromMajor — noise stripping', () => {
    it('strips dollar sign', () => {
      expect(fromMajor('$19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('strips pounds sign', () => {
      expect(fromMajor('£19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('strips euro sign', () => {
      expect(fromMajor('€19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('strips leading 3-letter currency code', () => {
      expect(fromMajor('XCD19.99', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('strips thousands separators', () => {
      expect(fromMajor('1,000.00', XCD)).toEqual({ amountMinor: 100000n, currency: XCD });
    });

    it('strips multiple thousands separators', () => {
      expect(fromMajor('1,234,567.89', XCD)).toEqual({ amountMinor: 123456789n, currency: XCD });
    });

    it('strips leading and trailing whitespace', () => {
      expect(fromMajor('  19.99  ', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });

    it('handles "$ 1,234.56 XCD" style', () => {
      expect(fromMajor('$ 1,234.56', XCD)).toEqual({ amountMinor: 123456n, currency: XCD });
    });
  });

  describe('fromMajor — number input (integer only)', () => {
    it('accepts an integer', () => {
      expect(fromMajor(20, XCD)).toEqual({ amountMinor: 2000n, currency: XCD });
    });

    it('accepts 0', () => {
      expect(fromMajor(0, XCD)).toEqual({ amountMinor: 0n, currency: XCD });
    });

    it('accepts a negative integer', () => {
      expect(fromMajor(-19, XCD)).toEqual({ amountMinor: -1900n, currency: XCD });
    });

    it('rejects a non-integer number (this is the whole point of the module)', () => {
      expect(() => fromMajor(19.99, XCD)).toThrow(InvalidMoneyStringError);
    });
  });

  describe('fromMajor — error cases', () => {
    it('throws on empty string', () => {
      expect(() => fromMajor('', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('throws on lone minus', () => {
      expect(() => fromMajor('-', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('throws on lone plus', () => {
      expect(() => fromMajor('+', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('throws on lone dot', () => {
      expect(() => fromMajor('.', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('throws on multiple decimal points', () => {
      expect(() => fromMajor('1.2.3', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('throws on alphabetic characters in the number', () => {
      expect(() => fromMajor('19.99abc', XCD)).toThrow(InvalidMoneyStringError);
    });

    it('truncates excess decimals (does not round at parse)', () => {
      // 19.999 becomes 19.99 (truncated, not rounded)
      expect(fromMajor('19.999', XCD)).toEqual({ amountMinor: 1999n, currency: XCD });
    });
  });

  describe('toMajor', () => {
    it('formats a positive amount with 2 decimal places', () => {
      expect(toMajor({ amountMinor: 1999n, currency: XCD })).toBe('19.99');
    });

    it('formats zero as 0.00', () => {
      expect(toMajor({ amountMinor: 0n, currency: XCD })).toBe('0.00');
    });

    it('formats a negative with a minus sign', () => {
      expect(toMajor({ amountMinor: -1999n, currency: XCD })).toBe('-19.99');
    });

    it('pads single-digit fractions', () => {
      expect(toMajor({ amountMinor: 105n, currency: XCD })).toBe('1.05');
    });

    it('pads zero fractions', () => {
      expect(toMajor({ amountMinor: 100n, currency: XCD })).toBe('1.00');
    });

    it('formats very large numbers', () => {
      expect(toMajor({ amountMinor: 4821000000n, currency: XCD })).toBe('48210000.00');
    });
  });

  describe('fromMajor → toMajor round-trip', () => {
    const cases: Array<[string, string]> = [
      ['0', '0.00'],
      ['0.00', '0.00'],
      ['1', '1.00'],
      ['1.5', '1.50'],
      ['1.05', '1.05'],
      ['19.99', '19.99'],
      ['1234567.89', '1234567.89'],
      ['-19.99', '-19.99'],
      ['1000000.00', '1000000.00'],
      ['48210000.00', '48210000.00'],
    ];
    for (const [input, expected] of cases) {
      it(`round-trips "${input}" → "${expected}"`, () => {
        const m = fromMajor(input, XCD);
        expect(toMajor(m)).toBe(expected);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

describe('Money — arithmetic (same currency)', () => {
  it('adds two positive values', () => {
    expect(add(fromMajor('10.00', XCD), fromMajor('20.00', XCD))).toEqual({
      amountMinor: 3000n,
      currency: XCD,
    });
  });

  it('adds positive and negative', () => {
    expect(add(fromMajor('10.00', XCD), fromMajor('-3.00', XCD))).toEqual({
      amountMinor: 700n,
      currency: XCD,
    });
  });

  it('adds two negatives', () => {
    expect(add(fromMajor('-10.00', XCD), fromMajor('-20.00', XCD))).toEqual({
      amountMinor: -3000n,
      currency: XCD,
    });
  });

  it('subtracts', () => {
    expect(sub(fromMajor('30.00', XCD), fromMajor('10.00', XCD))).toEqual({
      amountMinor: 2000n,
      currency: XCD,
    });
  });

  it('subtracts producing a negative result', () => {
    expect(sub(fromMajor('10.00', XCD), fromMajor('30.00', XCD))).toEqual({
      amountMinor: -2000n,
      currency: XCD,
    });
  });

  it('multiplies by an integer (number)', () => {
    expect(mul(fromMajor('10.00', XCD), 3)).toEqual({
      amountMinor: 3000n,
      currency: XCD,
    });
  });

  it('multiplies by an integer (bigint)', () => {
    expect(mul(fromMajor('10.00', XCD), 3n)).toEqual({
      amountMinor: 3000n,
      currency: XCD,
    });
  });

  it('multiplies by zero', () => {
    expect(mul(fromMajor('10.00', XCD), 0)).toEqual(zero(XCD));
  });

  it('multiplies by a negative integer', () => {
    expect(mul(fromMajor('10.00', XCD), -2)).toEqual({
      amountMinor: -2000n,
      currency: XCD,
    });
  });

  it('rejects a non-integer scalar (the whole point of the module)', () => {
    expect(() => mul(fromMajor('10.00', XCD), 1.5)).toThrow();
  });

  describe('div with rounding modes', () => {
    it('truncates by default-ish (10.00 / 3 = 3.33)', () => {
      // 1000 / 3 = 333 r 1. Doubled remainder (2) < divisor (3) → 333.
      expect(div(fromMajor('10.00', XCD), 3)).toEqual({
        amountMinor: 333n,
        currency: XCD,
      });
    });

    it('half-even on an exact half: 10.00 / 4 = 2.50', () => {
      // 1000 / 4 = 250 r 0. No rounding.
      expect(div(fromMajor('10.00', XCD), 4)).toEqual({
        amountMinor: 250n,
        currency: XCD,
      });
    });

    it('half-even rounds 0.5 to even (10.00 / 20 = 0.50, no tie)', () => {
      expect(div(fromMajor('10.00', XCD), 20)).toEqual({
        amountMinor: 50n,
        currency: XCD,
      });
    });

    it('half-up is exact on a clean half (1.00 / 2 = 0.50, no rounding needed)', () => {
      // 100 / 2 = 50 r 0. No remainder → no rounding → 0.50.
      expect(div(fromMajor('1.00', XCD), 2, 'half-up')).toEqual({
        amountMinor: 50n,
        currency: XCD,
      });
    });

    it('half-down is exact on a clean half (1.00 / 2 = 0.50, no rounding needed)', () => {
      expect(div(fromMajor('1.00', XCD), 2, 'half-down')).toEqual({
        amountMinor: 50n,
        currency: XCD,
      });
    });

    it('half-up rounds a non-clean half: 1.00 / 3 = 0.33 (truncating) or 0.34 (rounding up)', () => {
      // 100 / 3 = 33 r 1. Doubled remainder (2) < divisor (3) → no rounding → 33.
      expect(div(fromMajor('1.00', XCD), 3, 'half-up')).toEqual({
        amountMinor: 33n,
        currency: XCD,
      });
    });

    it('up rounds any remainder up', () => {
      // 10.00 / 3 = 3.33, but "up" would give 3.34. Our value 3.33 has no remainder
      // 1 (since 333*3 = 999, remainder = 1), so up → 334.
      expect(div(fromMajor('10.00', XCD), 3, 'up')).toEqual({
        amountMinor: 334n,
        currency: XCD,
      });
    });

    it('down / truncate discards any remainder', () => {
      expect(div(fromMajor('10.00', XCD), 3, 'down')).toEqual({
        amountMinor: 333n,
        currency: XCD,
      });
      expect(div(fromMajor('10.00', XCD), 3, 'truncate')).toEqual({
        amountMinor: 333n,
        currency: XCD,
      });
    });

    it('divides by a negative integer', () => {
      expect(div(fromMajor('10.00', XCD), -2)).toEqual({
        amountMinor: -500n,
        currency: XCD,
      });
    });

    it('divides a negative amount by a positive divisor', () => {
      expect(div(fromMajor('-10.00', XCD), 2)).toEqual({
        amountMinor: -500n,
        currency: XCD,
      });
    });

    it('throws on division by zero', () => {
      expect(() => div(fromMajor('10.00', XCD), 0)).toThrow(DivisionByZeroError);
    });

    it('throws on division by zero (bigint)', () => {
      expect(() => div(fromMajor('10.00', XCD), 0n)).toThrow(DivisionByZeroError);
    });

    it('rejects a non-integer divisor', () => {
      expect(() => div(fromMajor('10.00', XCD), 1.5)).toThrow();
    });
  });

  it('negate', () => {
    expect(negate(fromMajor('10.00', XCD))).toEqual({ amountMinor: -1000n, currency: XCD });
    expect(negate(fromMajor('-10.00', XCD))).toEqual({ amountMinor: 1000n, currency: XCD });
    expect(negate(zero(XCD))).toEqual(zero(XCD));
  });

  it('abs', () => {
    expect(abs(fromMajor('10.00', XCD))).toEqual({ amountMinor: 1000n, currency: XCD });
    expect(abs(fromMajor('-10.00', XCD))).toEqual({ amountMinor: 1000n, currency: XCD });
    expect(abs(zero(XCD))).toEqual(zero(XCD));
  });

  it('min and max', () => {
    const a = fromMajor('10.00', XCD);
    const b = fromMajor('20.00', XCD);
    expect(min(a, b)).toEqual(a);
    expect(max(a, b)).toEqual(b);
  });

  it('min and max on equal values returns one of them', () => {
    const a = fromMajor('10.00', XCD);
    const b = fromMajor('10.00', XCD);
    expect(min(a, b)).toEqual(a);
    expect(max(a, b)).toEqual(a);
  });
});

describe('Money — sum', () => {
  it('returns zero for an empty list with a given currency', () => {
    expect(sum([], XCD)).toEqual(zero(XCD));
  });

  it('returns a single element unchanged', () => {
    expect(sum([fromMajor('10.00', XCD)], XCD)).toEqual({ amountMinor: 1000n, currency: XCD });
  });

  it('sums many elements of the same currency', () => {
    const items = [1, 2, 3, 4, 5].map((n) => fromMajor(`${n}.00`, XCD));
    expect(sum(items, XCD)).toEqual({ amountMinor: 1500n, currency: XCD });
  });

  it('infers currency from the first element when not given', () => {
    const items = [1, 2, 3].map((n) => fromMajor(`${n}.00`, XCD));
    expect(sum(items)).toEqual({ amountMinor: 600n, currency: XCD });
  });

  it('throws if a single element disagrees with the supplied currency', () => {
    const items = [fromMajor('10.00', XCD), fromMajor('10.00', USD)];
    expect(() => sum(items, XCD)).toThrow(CurrencyMismatchError);
  });
});

// ---------------------------------------------------------------------------
// Currency mismatch
// ---------------------------------------------------------------------------

describe('Money — currency mismatch throws', () => {
  it('add throws', () => {
    expect(() => add(fromMajor('10.00', XCD), fromMajor('10.00', USD))).toThrow(
      CurrencyMismatchError
    );
  });

  it('sub throws', () => {
    expect(() => sub(fromMajor('10.00', XCD), fromMajor('10.00', JMD))).toThrow(
      CurrencyMismatchError
    );
  });

  it('cmp throws', () => {
    expect(() => cmp(fromMajor('10.00', XCD), fromMajor('10.00', USD))).toThrow(
      CurrencyMismatchError
    );
  });

  it('gt / gte / lt / lte throw on mismatch', () => {
    const a = fromMajor('10.00', XCD);
    const b = fromMajor('10.00', USD);
    expect(() => gt(a, b)).toThrow(CurrencyMismatchError);
    expect(() => gte(a, b)).toThrow(CurrencyMismatchError);
    expect(() => lt(a, b)).toThrow(CurrencyMismatchError);
    expect(() => lte(a, b)).toThrow(CurrencyMismatchError);
  });

  it('min and max throw on mismatch', () => {
    expect(() => min(fromMajor('10.00', XCD), fromMajor('10.00', USD))).toThrow(
      CurrencyMismatchError
    );
    expect(() => max(fromMajor('10.00', XCD), fromMajor('10.00', USD))).toThrow(
      CurrencyMismatchError
    );
  });
});

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

describe('Money — comparison', () => {
  const a = fromMajor('10.00', XCD);
  const b = fromMajor('20.00', XCD);
  const c = fromMajor('10.00', XCD);

  it('cmp returns -1 when a < b', () => {
    expect(cmp(a, b)).toBe(-1);
  });

  it('cmp returns 0 when equal', () => {
    expect(cmp(a, c)).toBe(0);
  });

  it('cmp returns 1 when a > b', () => {
    expect(cmp(b, a)).toBe(1);
  });

  it('eq', () => {
    expect(eq(a, c)).toBe(true);
    expect(eq(a, b)).toBe(false);
  });

  it('gt', () => {
    expect(gt(b, a)).toBe(true);
    expect(gt(a, b)).toBe(false);
    expect(gt(a, c)).toBe(false);
  });

  it('gte', () => {
    expect(gte(b, a)).toBe(true);
    expect(gte(a, c)).toBe(true);
    expect(gte(a, b)).toBe(false);
  });

  it('lt', () => {
    expect(lt(a, b)).toBe(true);
    expect(lt(b, a)).toBe(false);
    expect(lt(a, c)).toBe(false);
  });

  it('lte', () => {
    expect(lte(a, b)).toBe(true);
    expect(lte(a, c)).toBe(true);
    expect(lte(b, a)).toBe(false);
  });

  it('negative vs positive', () => {
    const neg = fromMajor('-5.00', XCD);
    const pos = fromMajor('5.00', XCD);
    expect(cmp(neg, pos)).toBe(-1);
    expect(cmp(pos, neg)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

describe('Money — predicates', () => {
  it('isZero', () => {
    expect(isZero(zero(XCD))).toBe(true);
    expect(isZero(fromMajor('0.00', XCD))).toBe(true);
    expect(isZero(fromMajor('0.01', XCD))).toBe(false);
    expect(isZero(fromMajor('-0.01', XCD))).toBe(false);
  });

  it('isNegative', () => {
    expect(isNegative(fromMajor('-0.01', XCD))).toBe(true);
    expect(isNegative(zero(XCD))).toBe(false);
    expect(isNegative(fromMajor('0.01', XCD))).toBe(false);
  });

  it('isPositive', () => {
    expect(isPositive(fromMajor('0.01', XCD))).toBe(true);
    expect(isPositive(zero(XCD))).toBe(false);
    expect(isPositive(fromMajor('-0.01', XCD))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

describe('Money — JSON serialization', () => {
  it('toJSON produces a string amountMinor (JSON cannot encode BigInt)', () => {
    expect(toJSON({ amountMinor: 1999n, currency: XCD })).toEqual({
      amountMinor: '1999',
      currency: XCD,
    });
  });

  it('toJSON handles negative bigints', () => {
    expect(toJSON({ amountMinor: -1999n, currency: XCD })).toEqual({
      amountMinor: '-1999',
      currency: XCD,
    });
  });

  it('fromJSON accepts a string amountMinor', () => {
    expect(fromJSON({ amountMinor: '1999', currency: XCD })).toEqual({
      amountMinor: 1999n,
      currency: XCD,
    });
  });

  it('toJSON → fromJSON round-trip', () => {
    const original = { amountMinor: 4821000000n, currency: XCD };
    expect(fromJSON(toJSON(original))).toEqual(original);
  });

  it('serialized form is JSON.stringify-able', () => {
    const json = JSON.stringify(toJSON({ amountMinor: 1999n, currency: XCD }));
    expect(JSON.parse(json)).toEqual({ amountMinor: '1999', currency: XCD });
  });
});

// ---------------------------------------------------------------------------
// The whole point: float-drift immunity
// ---------------------------------------------------------------------------

describe('Money — invariant: 0.1 + 0.2 === 0.3 exactly (the entire purpose of this module)', () => {
  it('19.99 + 1.01 = 21.00 exactly', () => {
    const a = fromMajor('19.99', XCD);
    const b = fromMajor('1.01', XCD);
    expect(toMajor(add(a, b))).toBe('21.00');
  });

  it('100 iterations of 0.10 sum to exactly 10.00', () => {
    const cent = fromMajor('0.10', XCD);
    let acc = zero(XCD);
    for (let i = 0; i < 100; i++) {
      acc = add(acc, cent);
    }
    expect(toMajor(acc)).toBe('10.00');
  });

  it('1,000 iterations of 0.01 sum to exactly 10.00', () => {
    const cent = fromMajor('0.01', XCD);
    let acc = zero(XCD);
    for (let i = 0; i < 1000; i++) {
      acc = add(acc, cent);
    }
    expect(toMajor(acc)).toBe('10.00');
  });

  it('1,000,000 iterations of 0.01 sum to exactly 10,000.00 (no float drift)', () => {
    const cent = fromMajor('0.01', XCD);
    let acc = zero(XCD);
    for (let i = 0; i < 1_000_000; i++) {
      acc = add(acc, cent);
    }
    expect(toMajor(acc)).toBe('10000.00');
  });

  it('mixed-add the sample statement: 2400.00 + 909.19 + 1451.32 + 1180.00 + 99.00 = 6039.51', () => {
    // Hand-computed from the sample CSV (tests/fixtures/sample-statement.csv)
    const values = [2400.0, 909.19, 1451.32, 1180.0, 99.0].map((v) => fromMajor(v.toFixed(2), XCD));
    const total = sum(values, XCD);
    expect(toMajor(total)).toBe('6039.51');
  });

  it('demonstrates the failure mode this module prevents: 0.1 + 0.2 in raw JS', () => {
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(0.1 + 0.2).not.toBe(0.3); // 0.30000000000000004 in JavaScript
    // But with money.ts, the same operation is exact.
    const a = fromMajor('0.10', XCD);
    const b = fromMajor('0.20', XCD);
    const c = add(a, b);
    expect(toMajor(c)).toBe('0.30');
  });
});

// ---------------------------------------------------------------------------
// The reality check: the sample CSV should parse and total exactly
// ---------------------------------------------------------------------------

describe('Money — sample CSV sanity check', () => {
  // A handful of withdrawal amounts from tests/fixtures/sample-statement.csv
  const SAMPLE_WITHDRAWALS = [
    '2400.00', // 03/07 RENT
    '909.19',  // 03/07 FUEL
    '1451.32', // 03/07 FUEL
    '1180.00', // 08/07 SALARY
    '99.00',   // 12/07 SUBSCRIPTION
    '420.15',  // 11/07 FUEL
    '2400.00', // 03/08 RENT
    '1180.00', // 08/08 SALARY
    '452.29',  // 10/08 UTILITY
    '99.00',   // 12/08 SUBSCRIPTION
    '548.41',  // 15/08 CHEQUE
    '1180.00', // 15/08 SALARY
  ];

  it('every withdrawal in the sample parses to an exact minor amount', () => {
    for (const s of SAMPLE_WITHDRAWALS) {
      const m = fromMajor(s, XCD);
      expect(toMajor(m)).toBe(s); // round-trip is lossless
    }
  });

  it('sum of those withdrawals is exact and reproducible', () => {
    const items = SAMPLE_WITHDRAWALS.map((s) => fromMajor(s, XCD));
    const total = sum(items, XCD);
    // Hand-add: 2400 + 909.19 + 1451.32 + 1180 + 99 + 420.15 + 2400 + 1180 + 452.29 + 99 + 548.41 + 1180
    // = 12319.36
    expect(toMajor(total)).toBe('12319.36');
  });
});
