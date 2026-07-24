# ADR-0005 — Fixed pipeline over autonomous agents

**Status:** Accepted · **Date:** 2026-07-24

## Context

Agentic systems can be built as autonomous agents that plan, negotiate, and dynamically decide what to do next, or as a fixed pipeline of narrow specialists with typed contracts. The former is more fashionable and more flexible; the latter is more predictable.

## Decision

VitalFlow uses a fixed, checkpointed, resumable pipeline of five narrow agents. The orchestrator owns sequencing; no agent chooses what runs next, and no agent reads another's internals.

## Consequences

- **Auditable.** A given input always traverses the same path, and every stage is recorded in an append-only `AgentRun` ledger. This is a precondition for lender and regulator trust.
- **Testable.** Each agent has fixture-based contract tests; the full pipeline has golden-file tests.
- **Cheap.** Only the stages that need a model call one. No planner burning tokens deciding what to do.
- **Resumable.** A failure at stage 4 does not re-run stages 1–3.
- **Less flexible.** Novel analytical questions require a new stage rather than emergent behaviour. This is an accepted trade: for financial analysis, the set of questions is well understood, and predictability is worth more than emergence.
- Autonomy is deferred to Phase 5, where always-on monitoring agents operate *around* this pipeline rather than replacing it.
