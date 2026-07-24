/**
 * Money — the most important type in VitalFlow.
 * See docs/adr/0004-money-as-integer-minor-units.md
 *
 * Amounts are INTEGER MINOR UNITS (cents). Never a float, never a bare number,
 * never without a currency.
 */

export type CurrencyCode = string; // ISO 4217, e.g. 'XCD' | 'TTD' | 'JMD' | 'BBD' | 'USD'

export interface Money {
  /** Signed integer minor units. Positive = inflow. */
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // RFC 3339, UTC
