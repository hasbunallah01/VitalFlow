# ADR-0003 — CSV-first ingestion for the MVP

**Status:** Accepted · **Date:** 2026-07-24

## Context

Ingestion options: Open Banking APIs, screen scraping, PDF/OCR, or file upload. In the Caribbean and most emerging markets, Open Banking coverage is thin to nonexistent, aggregator support is patchy, and integration timelines are measured in months of institutional negotiation.

Every bank, however, offers a transaction export.

## Decision

The MVP ingests CSV only. Excel arrives in Phase 2, connected sources in Phase 4, PDF/OCR when demand justifies the accuracy risk.

The ingestion layer is deliberately isolated behind the Data Validation Agent's output contract, so new sources become new adapters rather than a rewrite.

## Consequences

- Works with every bank on day one, in every jurisdiction, with no partnership required.
- Shifts the hard problem to format heterogeneity — no two banks export the same shape. Mitigated by column-role inference, a bank-profile library, and human confirmation when confidence is low.
- Manual export is friction, and re-analysis requires re-upload. Acceptable for a diagnostic tool; unacceptable for the Phase 5 always-on monitoring, which is exactly why connected sources come first in Phase 4.
- No credential handling and no funds movement in the MVP, which materially reduces the security and regulatory surface.
