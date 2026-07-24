# ADR-0004 — Money as integer minor units

**Status:** Accepted · **Date:** 2026-07-24

## Context

`0.1 + 0.2 !== 0.3` in IEEE 754. Accumulated across thousands of transactions, float arithmetic produces totals that do not reconcile with a bank statement — and a financial tool whose totals do not match the source document has no credibility.

## Decision

Money is represented everywhere as `{ amountMinor: bigint, currency: CurrencyCode }`:

- Integer minor units (cents), never a float or a bare number
- Explicit ISO 4217 currency — no implicit or default currency anywhere
- `BigInt` in the database, integer in the API, a `Money` type in application code
- All arithmetic goes through `lib/analysis/money.ts`; rounding is explicit at every division
- Formatting for display happens only at the presentation boundary

## Consequences

- Totals reconcile exactly with source statements.
- Currency mismatches become type errors rather than silent wrong answers.
- More verbose than plain numbers, and `BigInt` needs explicit serialisation at the JSON boundary.
- Multi-currency statements are out of scope for the MVP; the type makes that constraint explicit rather than accidental.
