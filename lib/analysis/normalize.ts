/**
 * Normalization utilities for the analysis layer.
 *
 * Every metric in a HealthAssessment is reduced to a value in [0, 1]
 * before being weighted. This file is the single source of truth for the
 * curves that turn a raw number into a score. The shape of each curve
 * is documented in docs/SCORING_METHODOLOGY.md.
 *
 * Design rule: curves are monotonic. A better raw value never produces
 * a worse score.
 */

export const EPS = 1e-9;

/** Clamp x into [lo, hi]. Returns 0 if either bound is NaN. */
export function clamp(x: number, lo: number, hi: number): number {
  if (Number.isNaN(x) || Number.isNaN(lo) || Number.isNaN(hi)) return 0;
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

/**
 * Linear map from [fromBad, fromGood] to [0, 1]. Values below fromBad
 * clamp to 0; above fromGood clamp to 1. If fromBad > fromGood, the
 * curve is inverted (high raw value → low score).
 */
export function linearMap(
  x: number,
  fromBad: number,
  fromGood: number,
): number {
  if (fromGood === fromBad) return x >= fromGood ? 1 : 0;
  const t = (x - fromBad) / (fromGood - fromBad);
  return clamp(t, 0, 1);
}

/**
 * Inverted linear map: 1 at fromBad, 0 at fromGood (or beyond).
 * Used for "lower is better" metrics like CV, drawdown, overdraft days.
 */
export function linearMapInverted(
  x: number,
  fromBad: number,
  fromGood: number,
): number {
  if (fromGood === fromBad) return x <= fromGood ? 1 : 0;
  const t = (x - fromBad) / (fromGood - fromBad);
  return clamp(1 - t, 0, 1);
}

/**
 * Coefficient of variation: stdev / |mean|. Returns 0 for constant series.
 * Returns Infinity if mean is 0 and stdev is non-zero (caller should
 * handle that — see score.ts for the runway case).
 */
export function coefficientOfVariation(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  if (Math.abs(mean) < EPS) {
    let sq = 0;
    for (const v of values) sq += v * v;
    return Math.sqrt(sq / values.length) < EPS ? 0 : Infinity;
  }
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const variance = sq / (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

/** Population mean. Returns 0 for empty input. */
export function mean(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Sample standard deviation (n-1 denominator). Returns 0 for length<2. */
export function stddev(values: ReadonlyArray<number>): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let sq = 0;
  for (const v of values) sq += (v - m) * (v - m);
  return Math.sqrt(sq / (values.length - 1));
}

/**
 * Longest run of consecutive indices where predicate is true.
 * Returns 0 if none.
 */
export function longestRun(
  values: ReadonlyArray<number>,
  predicate: (v: number) => boolean,
): number {
  let best = 0;
  let cur = 0;
  for (const v of values) {
    if (predicate(v)) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/**
 * Maximum peak-to-trough drawdown on a cumulative series derived from
 * the given periodic values. Returns a fraction in [0, 1] of the running
 * peak (NOT of the starting balance). A drawdown of 0.34 means the
 * cumulative balance fell 34% below its previous high.
 */
export function maxDrawdown(periodValues: ReadonlyArray<number>): number {
  let cum = 0;
  let peak = 0;
  let maxDd = 0;
  for (const v of periodValues) {
    cum += v;
    if (cum > peak) peak = cum;
    if (peak > EPS) {
      const dd = (peak - cum) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return clamp(maxDd, 0, 1);
}

/**
 * Ordinary least-squares slope of y on x. Returns 0 for length<2 or
 * zero-variance x. The slope is in y-units per x-unit; divide by the
 * mean of y to get a per-period growth rate.
 */
export function olsSlope(
  values: ReadonlyArray<number>,
): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? values[0]! : 0 };
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(i);
  const m_x = mean(xs);
  const m_y = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - m_x;
    num += dx * (values[i]! - m_y);
    den += dx * dx;
  }
  if (Math.abs(den) < EPS) return { slope: 0, intercept: m_y };
  const slope = num / den;
  const intercept = m_y - slope * m_x;
  return { slope, intercept };
}

/**
 * Herfindahl-Hirschman Index on a slice-of-pie: sum of squared shares.
 * Returns a number in (0, 1]. 1 = one party has 100%, lower = more
 * diversified. For a 4-equal-party market, HHI = 4 * 0.25^2 = 0.25.
 */
export function hhi(shares: ReadonlyArray<number>): number {
  if (shares.length === 0) return 0;
  let total = 0;
  for (const s of shares) total += s;
  if (Math.abs(total) < EPS) return 0;
  let acc = 0;
  for (const s of shares) {
    const sh = s / total;
    acc += sh * sh;
  }
  return acc;
}

/** Round to 1 decimal place. Used everywhere a "displayed" value appears. */
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Round to 2 decimal places. Used for currency-as-display (not money). */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
