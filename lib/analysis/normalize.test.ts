import { describe, expect, it } from 'vitest';
import {
  clamp,
  linearMap,
  linearMapInverted,
  coefficientOfVariation,
  mean,
  stddev,
  longestRun,
  maxDrawdown,
  olsSlope,
  hhi,
  round1,
  round2,
  EPS,
} from './normalize';

describe('clamp', () => {
  it('clamps below low', () => expect(clamp(-1, 0, 1)).toBe(0));
  it('clamps above high', () => expect(clamp(2, 0, 1)).toBe(1));
  it('passes through inside', () => expect(clamp(0.5, 0, 1)).toBe(0.5));
  it('returns 0 on NaN', () => expect(clamp(NaN, 0, 1)).toBe(0));
});

describe('linearMap / linearMapInverted', () => {
  it('maps 0..10 to 0..1', () => {
    expect(linearMap(0, 0, 10)).toBe(0);
    expect(linearMap(5, 0, 10)).toBe(0.5);
    expect(linearMap(10, 0, 10)).toBe(1);
  });
  it('inverted maps high→low', () => {
    expect(linearMapInverted(0, 0, 1)).toBe(1);
    expect(linearMapInverted(0.5, 0, 1)).toBe(0.5);
    expect(linearMapInverted(1, 0, 1)).toBe(0);
    expect(linearMapInverted(2, 0, 1)).toBe(0);
  });
  it('handles inverted above max', () => {
    expect(linearMapInverted(1.5, 0, 1)).toBe(0);
  });
});

describe('mean / stddev / CV', () => {
  it('mean of empty is 0', () => expect(mean([])).toBe(0));
  it('mean of constants', () => expect(mean([5, 5, 5])).toBe(5));
  it('stddev of constants is 0', () => expect(stddev([5, 5, 5])).toBe(0));
  it('stddev of [1,2,3]', () => expect(stddev([1, 2, 3])).toBeCloseTo(1, 9));
  it('CV of constant series is 0', () => expect(coefficientOfVariation([7, 7, 7])).toBe(0));
  it('CV of [1,2,3]', () => {
    // mean=2, var=(1+0+1)/2=1, sd=1, cv=0.5
    expect(coefficientOfVariation([1, 2, 3])).toBeCloseTo(0.5, 9);
  });
  it('CV of zeros is 0', () => expect(coefficientOfVariation([0, 0, 0])).toBe(0));
  it('CV with zero mean but non-zero values is Infinity', () => {
    expect(coefficientOfVariation([1, -1])).toBe(Infinity);
  });
});

describe('longestRun', () => {
  it('no matches', () => expect(longestRun([1, 2, 3], () => false)).toBe(0));
  it('all match', () => expect(longestRun([1, 2, 3], () => true)).toBe(3));
  it('middle streak', () =>
    expect(longestRun([0, 1, 1, 0, 1, 1, 1, 0], v => v === 1)).toBe(3));
  it('zero streak in mixed', () =>
    expect(longestRun([0, 0, 1, 0, 0, 0], v => v === 0)).toBe(3));
});

describe('maxDrawdown', () => {
  it('all positive: 0', () =>
    expect(maxDrawdown([10, 10, 10])).toBe(0));
  it('monotonic rise: 0', () =>
    expect(maxDrawdown([1, 2, 3, 4])).toBe(0));
  it('monotonic fall from peak: 100%', () =>
    expect(maxDrawdown([10, -10])).toBeCloseTo(1, 9));
  it('partial pullback', () => {
    // peak=10 after [10, -4] -> cum=6, dd=4/10=0.4
    expect(maxDrawdown([10, -4, 0])).toBeCloseTo(0.4, 9);
  });
  it('recovers from drawdown: only the max matters', () => {
    // peak after [10, -4] = 10, cum=6, dd=0.4. Then [10] brings peak=16, cum=16, dd=0.
    expect(maxDrawdown([10, -4, 10])).toBeCloseTo(0.4, 9);
  });
  it('empty series: 0', () => expect(maxDrawdown([])).toBe(0));
});

describe('olsSlope', () => {
  it('linear trend', () => {
    // y = 2x + 1
    const r = olsSlope([1, 3, 5, 7, 9]);
    expect(r.slope).toBeCloseTo(2, 9);
    expect(r.intercept).toBeCloseTo(1, 9);
  });
  it('flat: slope 0', () => {
    const r = olsSlope([5, 5, 5, 5]);
    expect(r.slope).toBe(0);
  });
  it('too short: returns 0 slope', () => {
    expect(olsSlope([]).slope).toBe(0);
    expect(olsSlope([1]).slope).toBe(0);
  });
});

describe('hhi', () => {
  it('monopoly = 1', () => expect(hhi([100])).toBe(1));
  it('four equal = 0.25', () => expect(hhi([25, 25, 25, 25])).toBe(0.25));
  it('two equal halves = 0.5', () => expect(hhi([50, 50])).toBe(0.5));
  it('empty = 0', () => expect(hhi([])).toBe(0));
});

describe('rounding', () => {
  it('round1', () => {
    expect(round1(1.23)).toBe(1.2);
    expect(round1(1.25)).toBe(1.3); // banker's rounding via Math.round
    expect(round1(0)).toBe(0);
  });
  it('round2', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
  });
});
