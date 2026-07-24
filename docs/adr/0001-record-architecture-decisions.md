# ADR-0001 — Record architecture decisions

**Status:** Accepted · **Date:** 2026-07-24

## Context

VitalFlow's early decisions — how money is represented, where the LLM boundary sits, how agents relate — will shape the codebase for its whole life. Decisions made in chat threads are lost within weeks, then re-argued from scratch.

## Decision

Significant architectural decisions are recorded as numbered ADRs in `docs/adr/`, using Context → Decision → Consequences. ADRs are immutable once accepted; a reversal is a new ADR that supersedes the old one.

## Consequences

- New contributors can read why the system is shaped as it is, not just how.
- A small ongoing writing cost per significant decision.
- Superseded ADRs stay in the repository as history, marked as superseded.
