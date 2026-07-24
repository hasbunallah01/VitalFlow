# Roadmap

> Direction, not contract. Dates move; sequence and priorities are the point.

**Legend:** ✅ done · 🔨 in progress · ⏳ planned · 💭 exploratory

---

## Phase 0 — Foundations ✅

*Documentation and scaffolding before code.*

- [x] Problem definition and market positioning
- [x] Architecture design and layer boundaries
- [x] Five-agent pipeline contracts
- [x] Financial Health Score methodology
- [x] API surface design
- [x] Data model design
- [x] Security and privacy posture
- [x] Design system direction
- [x] Repository scaffolding, CI, templates, contribution guide

**Exit criterion:** an engineer joining on day one can read `docs/` and start implementing without asking what to build.

---

## Phase 1 — MVP 🔨

*The buildathon sprint. One complete, working path: CSV in, intelligence out.*

### Milestone 1.1 — Ingestion

- [ ] Upload UI with drag-and-drop, size and type validation
- [ ] Streaming CSV parser with encoding and delimiter detection
- [ ] Column-role inference (header matching + value-shape analysis)
- [ ] Column mapping confirmation UI for the ambiguous case
- [ ] Date-format disambiguation across the whole file
- [ ] Amount normalisation to integer minor units
- [ ] `DataQualityReport` generation
- [ ] Data Validation Agent complete against fixtures

### Milestone 1.2 — Deterministic core

- [ ] `money.ts` — minor-unit arithmetic, currency, formatting
- [ ] `cashflow.ts`, `revenue.ts`, `expenses.ts`, `liquidity.ts`, `anomalies.ts`
- [ ] `recurring.ts` — periodicity detection
- [ ] Counterparty clustering and internal-transfer detection
- [ ] Rule-based categorisation engine
- [ ] `score.ts` — five pillars, composite, bands, confidence
- [ ] 90%+ unit coverage, golden-file tests over fixture statements

### Milestone 1.3 — Agents and orchestration

- [ ] Agent base contract, `AgentRun` ledger, cost accounting
- [ ] Orchestrator with state machine, checkpointing, retries
- [ ] Transaction Analysis Agent
- [ ] Financial Health Agent
- [ ] LLM client with structured output, redaction, numeric-fidelity checking
- [ ] Insight Generation Agent + versioned prompt
- [ ] Graceful `DEGRADED` path when the LLM is unavailable
- [ ] SSE progress streaming

### Milestone 1.4 — Product surface

- [ ] Health score visualisation with pillar breakdown
- [ ] Cash-flow charts (monthly inflow/outflow, net, balance)
- [ ] Revenue and expense trend views
- [ ] Recurring transactions view
- [ ] Risk indicators panel
- [ ] Funding readiness panel with blockers and remedies
- [ ] Ranked recommendations
- [ ] Landing page
- [ ] Mobile-responsive throughout — many MSME owners have no laptop

### Milestone 1.5 — Report

- [ ] Report Generation Agent and structured report model
- [ ] Server-side chart rendering
- [ ] PDF layout including the methodology and confidence section
- [ ] Download endpoint with signed URLs

### Milestone 1.6 — Ship

- [ ] E2E test: upload → analysis → report
- [ ] Adversarial fixture suite (malformed CSVs, injection in descriptions, extreme values)
- [ ] Deployment, environment configuration, error monitoring
- [ ] Demo statements for at least three Caribbean bank formats
- [ ] Two-minute demo walkthrough

**Definition of done:** a business owner who has never seen VitalFlow can upload a real statement and get a correct, useful, downloadable assessment without assistance.

---

## Phase 2 — Depth ⏳

*From a one-shot tool to a system a business returns to.*

- [ ] Authentication and organisation accounts
- [ ] Analysis history and saved statements
- [ ] Period-over-period comparison ("what changed since last quarter?")
- [ ] Multi-statement consolidation across several accounts
- [ ] Personal vs business spending detection — near-universal in MSME accounts
- [ ] Named bank-profile library, community-contributable
- [ ] Excel (`.xlsx`) ingestion
- [ ] Sector selection, with sector-aware thresholds
- [ ] Insight feedback loop ("was this useful?") to improve prompts
- [ ] Spanish localisation
- [ ] Queue-backed orchestration (BullMQ / pg-boss)

---

## Phase 3 — The credit layer ⏳

*Where VitalFlow stops being a tool and becomes infrastructure.*

- [ ] Standardised underwriting profile schema
- [ ] Consent framework — granular, time-bound, revocable, fully logged
- [ ] Lender-facing shared view with access audit trail
- [ ] Partner API with scoped API keys and webhooks
- [ ] Data-integrity verification signals for third-party reliance
- [ ] Score validation against real lending outcomes with partner institutions
- [ ] Recalibration of weights and thresholds against observed defaults
- [ ] Compliance review per target jurisdiction

**This is the phase that answers the buildathon's actual brief:** enabling cash-flow-based lending where collateral-based lending has excluded viable businesses.

---

## Phase 4 — Connected data ⏳

*Stop asking people to export CSVs.*

- [ ] Open Banking / bank API connections where available
- [ ] Mobile money and wallet integrations
- [ ] POS and payment processor integrations
- [ ] Invoicing and accounting tool connections
- [ ] Continuous ingestion with incremental re-analysis
- [ ] PDF and image statement ingestion via OCR, for banks with no CSV export

---

## Phase 5 — Always-on intelligence ⏳

*From periodic analysis to a monitoring agent that never sleeps.*

- [ ] Monitoring agent that runs continuously against connected data
- [ ] Drift and anomaly alerts (unusual outflow, revenue drop, runway threshold breach)
- [ ] 30/60/90-day cash-flow forecasting with confidence intervals
- [ ] Scenario modelling ("what if my largest client leaves?")
- [ ] Peer benchmarking against anonymised sector cohorts
- [ ] Proactive funding-readiness notification when a business crosses a tier

---

## Exploratory 💭

- Conversational interface over your own financial data
- Receivables intelligence — DSO, chronic late payers, collection prioritisation
- Supplier and cost benchmarking
- Embedded distribution through banks, credit unions, and business associations
- Offline-first mode for low-connectivity environments
- Regional aggregate insight — anonymised MSME health indicators as a public good

---

## Explicit non-goals

Stated so they don't creep in:

- ❌ **We will not become accounting software.** No ledgers, no reconciliation, no tax filing.
- ❌ **We will not make lending decisions.** We supply structured, auditable profiles; licensed institutions decide.
- ❌ **We will not sell user financial data.** Ever. Access is consent-based and revocable.
- ❌ **We will not present model-generated numbers as computed figures.** The deterministic boundary is permanent.
- ❌ **We will not build a payments product.** Analysis is the wedge; moving money is a different company.
