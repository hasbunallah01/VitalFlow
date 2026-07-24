# ADR-0002 — Deterministic core, narrative LLM

**Status:** Accepted · **Date:** 2026-07-24

## Context

VitalFlow could compute its financial metrics by passing transactions to a language model and asking for analysis. That would be faster to build and would demo well.

It would also be indefensible. A health score that changes between runs on identical input cannot be explained to a business owner, audited by a lender, or defended to a regulator. Language models are also unreliable at arithmetic over long numeric sequences, and their errors are fluent and confident.

## Decision

A hard boundary:

- **All numbers are computed by deterministic TypeScript** in `lib/analysis/`. Pure functions, no I/O, unit-tested, reproducible.
- **The LLM receives computed metrics** and produces explanation, prioritisation, and recommendation only.
- **Any figure appearing in generated text must match a value supplied in the context.** Violations are dropped and logged.
- **Recommendation impact estimates are computed by re-running the deterministic scorer**, not estimated by the model.

## Consequences

- Identical input always produces an identical score. Auditable end to end.
- The product still works when the model is unavailable — `DEGRADED` mode delivers metrics, score, and charts without narrative.
- More code to write than a prompt-only approach, and metric coverage grows only as fast as we implement it.
- The LLM is used where it is genuinely strong: language, judgement about salience, and prioritisation.
