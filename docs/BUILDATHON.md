# FutureCaribbean 2026 — Track Alignment

VitalFlow is being prepared for the **FutureCaribbean Global Agentic AI Buildathon**, under the **Finance, Payments & MSME Capital** track.

## The track brief, and our reading of it

The track is explicit that the core opportunity is the **MSME credit layer**: systems that aggregate fragmented business data, generate real-time credit profiles, enable lending without collateral, and integrate with lenders and financial institutions.

It also sets a bar that is worth repeating verbatim in spirit: *strong teams build financial infrastructure; weak teams build apps.*

Around 80–90% of businesses in the region are MSMEs, and they are systematically underfinanced — not because capital is absent, but because lending is collateral-based rather than cash-flow-based. A profitable, stable business with no property to pledge is declined. The data that would prove its creditworthiness already exists, in bank statements, unread.

## Why VitalFlow answers it

The insight that shapes the whole architecture: **the business-owner product and the lender infrastructure are the same engine.**

| | |
| --- | --- |
| **What the owner gets** | Why their cash flow is fragile, what to fix, in what order |
| **What the lender gets** | A structured, auditable, verifiable cash-flow profile for a business that was previously invisible |
| **What produces both** | One deterministic analysis pipeline with a full audit ledger |

Building the owner-facing product first is a distribution strategy, not a detour. Lenders will not adopt an underwriting layer that has no businesses in it. Business owners will adopt a tool that tells them why they were declined. The consent-based credit layer is Phase 3 precisely because it needs Phase 1's users to exist first.

## Design choices made for this track's constraints

The track names the real conditions solutions must survive. Each has an explicit architectural answer:

| Constraint | Our response |
| --- | --- |
| Limited standardised financial data across jurisdictions | Column-role inference plus a growing bank-profile library; human-in-the-loop confirmation when confidence is low |
| Fragmented systems across institutions and islands | CSV as the universal lowest common denominator; connected sources added in Phase 4, not depended on in Phase 1 |
| KYC/AML and regulatory requirements | We hold no funds and make no credit decisions; consent is granular, time-bound, revocable, and logged |
| Low lender trust in unsecured models | Deterministic scoring, published methodology, per-conclusion provenance, append-only agent audit ledger |
| Multi-currency, multi-jurisdiction | Currency-explicit money type and locale-aware formatting from the first commit |

## Why agentic, and why *this* agent design

The buildathon asks for deployable agentic systems, not demos. Our agents are narrow specialists in a checkpointed, resumable pipeline rather than autonomous negotiators, because a credit-relevant conclusion produced by an unrepeatable multi-agent conversation cannot be defended to a regulator or a credit officer.

Each agent writes an `AgentRun` record with its version, prompt ID, model, input hash, cost, and duration. Any output can be reproduced. That auditability is what makes the system usable as financial infrastructure rather than as an interesting demo.

Phase 5 is where "always-on" becomes literal: monitoring agents that watch connected data continuously and alert on drift rather than waiting for someone to upload a file.

## What "working" means for the sprint

A business owner who has never seen VitalFlow uploads a real bank statement and receives a correct, useful, downloadable financial assessment — without assistance, on a phone, in under a minute.

Not a mock. Not a deck. A working path from raw data to a decision the owner can act on and hand to a lender.

## Team

| | |
| --- | --- |
| **Repository** | https://github.com/hasbunallah01/VitalFlow |
| **Track** | Finance, Payments & MSME Capital |
| **Programme** | FutureCaribbean 2026 Global Open-Source Agentic AI Buildathon |
