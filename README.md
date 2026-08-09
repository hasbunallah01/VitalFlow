<div align="center">

<img src="docs/assets/vitalflow-logo.svg" alt="VitalFlow" width="220" />

### Caribbean MSME Financial Health & Funding Infrastructure.

**VitalFlow turns a bank statement into a lender-ready credit profile — and keeps working for the business long after the upload.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0F766E.svg?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--MVP%20scaffolding-F59E0B?style=flat-square)](docs/ROADMAP.md)
[![FutureCaribbean 2026](https://img.shields.io/badge/FutureCaribbean-2026-0F766E?style=flat-square)](https://futurecaribbean.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-0EA5E9?style=flat-square)](CONTRIBUTING.md)

[Vision](#vision) · [Problem](#the-problem) · [Solution](#the-solution) · [Agents](#the-five-agents) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Build Tracker](BUILD_CHECKPOINTS.md)

</div>

---

> [!NOTE]
> **This repository is currently documentation and scaffolding.** The architecture, agent contracts, scoring methodology, data model, and API surface are being designed in the open *before* the first line of application code is written. The 22-day build plan is in [BUILD_CHECKPOINTS.md](BUILD_CHECKPOINTS.md).

---

## Vision

In the Caribbean, **85% of small business loan applications are rejected in The Bahamas, 55% in Jamaica, 42% in Belize, 35% in Barbados.** The IDB estimates **87% of MSME financing needs in Latin America and the Caribbean are unmet** — not because the capital doesn't exist, but because the data that would prove creditworthiness is unreadable to the institutions that hold the capital.

VitalFlow is a **Caribbean MSME Financial Health & Funding Infrastructure** that closes that legibility gap. It is the missing layer that turns a raw bank statement into a structured, auditable, lender-ready credit profile — and then keeps working for the business, not just on the day of upload.

We believe cash flow is the most under-used asset in small business. It is already recorded, already trusted by lenders, and already sitting in every bank statement. It just isn't *readable*. VitalFlow makes it readable — first for the owner, then for the institutions that decide whether to fund them.

---

## The Problem

**Small businesses have financial data. They do not have financial understanding — and the institutions that could fund them cannot underwrite them.**

A bank statement tells a business owner what happened. It does not tell them what it *means*, and the bank officer does not have time to find out.

| What the owner sees | What they actually need to know | What the lender needs to see |
| --- | --- | --- |
| A list of 400 transactions | Is my revenue becoming more predictable or less? | A normalized, auditable cash-flow profile |
| A closing balance | How many months can I survive if income stops? | Months of operating runway, days cash on hand |
| Total expenses for the month | Which costs are quietly growing faster than my income? | Expense growth vs. revenue growth, fixed-cost coverage |
| A negative month | Is this a seasonal dip or the start of a trend? | Cyclical patterns, structural breaks, anomalies |
| "The bank said no" | What specifically makes me un-fundable, and how do I fix it? | Traceable score, named blockers, ranked remedies |

The Caribbean MSME financing problem is not a capital problem. It is a **legibility problem** — and it is a regional one. Banking infrastructure is fragmented across 20+ jurisdictions and 7+ currencies. There is no shared credit profile format. There is no cash-flow-based underwriting layer that lenders can consume.

VitalFlow attacks that gap on both sides: the business-owner product earns trust and distribution, the lender-facing credit profile API moves capital.

---

## The Solution

VitalFlow is a **semi-autonomous Caribbean MSME financial infrastructure**, not a one-shot analysis tool. The business owner uploads a bank statement; the system computes a verifiable 5-pillar health score; and then **a set of closed-loop agents keep working for the business** — watching for material changes, drafting funding-outreach plans, preparing lender-ready evidence packs, and tracking lender engagement.

The agents operate within the **Approver pattern**: they observe, decide, and act on their own initiative within a defined scope, but every consequential action — sending anything to a lender, sharing data, deleting records — pauses for the business owner's approval.

### The core design principle: **Deterministic core, AI narrative**

This is the single most important architectural decision in the project, and it exists because financial software must be *auditable*.

```
Numbers are computed. Meaning is generated.
```

- Every figure — health score, volatility, runway, concentration, growth rate — is calculated by **deterministic TypeScript**, is unit-tested, and is reproducible from the same input.
- The **LLM never invents a figure.** It receives computed metrics and produces explanation, prioritisation, and recommendation.
- Every insight carries provenance: which metric produced it, and which transactions produced that metric.

If a business owner asks "why is my score 63?", VitalFlow can answer that question all the way down to the individual transaction. If a credit officer asks the same question, the answer is byte-comparable.

---

## What VitalFlow is *not*

- ❌ Not bookkeeping software — it does not maintain ledgers or produce statutory accounts
- ❌ Not accounting software — it does not do reconciliation, tax filing, or double-entry
- ❌ Not a dashboard that just renders a balance in a nicer font
- ❌ Not a black box that outputs a number with no reasoning
- ❌ **Not a one-shot tool** — it does not stop at the report
- ❌ Not autonomous in a way that takes consequential actions without a human

---

## The Five Agents

VitalFlow is built as a **pipeline of narrow agents**, each with exactly one responsibility, each with a typed input and output contract, each independently testable. Four of them are deterministic; the orchestrator adds a fifth — a **closed-loop, semi-autonomous agent** that operates on the system of record over time.

| # | Agent | LLM? | Responsibility | Consumes | Produces |
| --- | --- | --- | --- | --- | --- |
| 1 | 🛡️ **Data Validation** | Optional (column ambiguity only) | Make untrusted data trustworthy | Raw CSV | Normalised, typed `Transaction[]` + `DataQualityReport` |
| 2 | 🔍 **Transaction Analysis** | Optional (categorisation fallback) | Find the structure hidden in the data | Clean transactions | Categories, recurring series, counterparties, monthly aggregates |
| 3 | 🩺 **Financial Health** | **No — fully deterministic** | Quantify the condition | Patterns + aggregates | Composite score, 5-pillar breakdown, risk flags, runway, funding tier |
| 4 | 💡 **Insight Generation** | **Yes — primary** | Turn numbers into meaning | `HealthAssessment` + redacted aggregates | Narrative, ranked insights, recommendations, funding narrative |
| 5 | 🤝 **Funding Outreach** | Yes (planning only) | **Close the loop with the outside world** | Completed `Analysis` + lender-program rules | Funding Outreach Plan, draft evidence pack, lender-facing profile, audit-trailed follow-up |

**The first four agents are a pipeline. The fifth is a closed loop.** When the pipeline completes, the Funding Outreach Agent wakes up, observes the result, plans a funding outreach, and either asks the business owner to approve a consequential action (sending an evidence pack to a lender) or executes an observable action automatically (writing to the system of record, scheduling the next check-in). It is the system's way of *continuing* to work after the analysis is done.

See [docs/AGENTS.md](docs/AGENTS.md) for contracts, prompts, guardrails, and failure modes.

---

## Semi-Autonomous Behavior

VitalFlow is not "always on" in the way a trading bot is always on. There is no continuous bank-data feed in the Caribbean. But it is **always-on in the way a smart security camera is always-on** — it wakes up on a schedule, on an event, or on a user action, and does things without being asked.

| Trigger | Agent | What it does | Approval required? |
| --- | --- | --- | --- |
| **Vercel cron, daily 9am** | 🩺 Watcher | Compares last analysis to the business's history. If anything material changed, writes a `WatchEvent` and emails the owner. | No (observable only) |
| **Vercel cron, weekly Mon 9am** | 🤝 Matchmaker | If the business's profile now meets a funding program's eligibility rules, drafts a `FundingOutreach` plan and emails the owner. | **Yes — before any send** |
| **Webhook: lender opens share link** | 👁️ Lender Access Monitor | Updates `ShareLink.accessCount`, transitions `FundingOutreach.status` to `viewed-by-lender`, notifies the business. | No (observable only) |
| **New analysis uploaded** | 🔄 Delta Agent | Compares new analysis to the previous one, writes a `DeltaRecord`, surfaces "what changed since last time". | No (observable only) |
| **Manual button in the UI** | Any | Lets the owner trigger any agent on demand, for the demo or for ad-hoc re-evaluation. | Varies |

The user sees: *"I came back to the app and VitalFlow had done things."* The system sees: an event-driven, serverless agentic runtime with auditable state. Both are true.

---

## Core Features

| | Feature | Description |
| --- | --- | --- |
| 📄 | **Statement ingestion** | CSV upload with intelligent column mapping — handles the fact that no two Caribbean banks export the same shape |
| 🧮 | **Financial Health Score** | A 0–100 composite across five weighted pillars, with a full breakdown of what drove it |
| 💧 | **Cash-flow diagnosis** | Inflow/outflow rhythm, volatility, negative-month detection, liquidity buffer and runway |
| 📈 | **Income & expense trends** | Month-over-month direction, growth rates, and whether expenses are outpacing revenue |
| 🔁 | **Recurring transaction detection** | Identifies subscriptions, rent, loan repayments, retainers — the fixed spine of the business |
| 🎯 | **Revenue quality analysis** | Predictability, customer concentration, recurring vs one-off share |
| 🚨 | **Risk indicators** | Overdraft events, returned payments, unusual outflows, concentration risk, seasonality exposure |
| 🏦 | **Funding readiness** | A lender's-eye view: tier, named blockers, each with the change that would clear it |
| 💡 | **Prioritised recommendations** | Specific, ranked, quantified actions — not "reduce expenses" but which expense, by how much, and the projected effect |
| 🤝 | **Funding Outreach Agent** | The closed loop. Drafts lender-ready evidence packs, asks approval, creates shareable links, follows up on access |
| 🔌 | **Lender-facing credit profile API** | A normalized, consent-based credit profile endpoint that lenders (or mock lender dashboards) can consume |
| 📑 | **PDF report** | A shareable, typeset report with full methodology disclosure |
| 🌍 | **Multi-currency** | XCD, TTD, JMD, BBD, GYD, NGN, USD and more — currency-explicit arithmetic from the first commit |
| 📜 | **Append-only audit ledger** | Every agent run, every access, every consequential decision — recorded forever |

---

## Example User Workflow

**Meet Amara.** She runs a five-person catering business in Barbados. She banks with a local bank, has no accountant, and was declined for a working-capital loan last month with no explanation.

```
 1. Amara exports 12 months of transactions from her online banking as CSV.

 2. She signs up at vitalflow.haybee.xyz, creates her business profile,
    and drops the file into VitalFlow.
    → The Data Validation Agent detects the column layout, normalises 1,184
      transactions, flags 3 rows with unparseable dates, and asks her to
      confirm the currency is XCD.

 3. She clicks "Analyse".
    → The pipeline runs. She watches each agent complete in real time:
      validated → analysed → scored → interpreted → outreach.  (~40 seconds)

 4. She gets her assessment:

    ┌─────────────────────────────────────────────────────────────┐
    │  FINANCIAL HEALTH SCORE                                     │
    │                                                             │
    │              63 / 100    ·   WATCH                          │
    │                                                             │
    │  Cash Flow Stability      ███████░░░  17 / 25               │
    │  Revenue Quality          ██████░░░░  14 / 25               │
    │  Expense Discipline       ████████░░  16 / 20               │
    │  Liquidity & Runway       ████░░░░░░   9 / 20               │
    │  Risk Profile             ███████░░░   7 / 10               │
    └─────────────────────────────────────────────────────────────┘

 5. She reads what it actually means:
    "Your revenue grew 18% over the year, but it is highly concentrated —
     two clients account for 61% of income. In the three months where the
     larger client paid late, you went into overdraft. Your operating
     runway is 1.4 months — the single biggest constraint on your fundability."

 6. The system keeps going. The Funding Outreach Agent drafts a plan:

    ┌─────────────────────────────────────────────────────────────┐
    │  FUNDING OUTREACH PLAN                                      │
    │                                                             │
    │  Based on your current profile, you now qualify for:        │
    │                                                             │
    │   ▸ Development Bank of Jamaica — Working Capital           │
    │     (eligible: score ≥ 60, no critical risk flags)         │
    │   ▸ CDB Caribbean MSME Line of Credit                       │
    │     (eligible: ≥ 6 months data, score ≥ 55)                │
    │                                                             │
    │  Evidence pack prepared. Awaiting your approval to share.   │
    │                                                             │
    │            [  Approve & send  ]  [  Modify  ]  [  Reject  ] │
    └─────────────────────────────────────────────────────────────┘

 7. Amara approves. The system creates a ShareLink, writes a
    FundingOutreach row, emails the lender. A few days later, the
    lender opens the link twice. VitalFlow sees it and emails Amara:

    "The lender viewed your packet 2 times this week. They looked at
     your score and your cash flow chart. Want to follow up?"

 8. Amara comes back next month and uploads a fresh statement. The
    Delta Agent fires automatically:

    "Your score moved from 63 to 71. Liquidity improved by 4 points.
     But watch out — your concentration got slightly worse: now 67%
     from your top 2 clients."

 9. She downloads the PDF and takes it to her bank officer. This time
    the conversation is different — she has a structured, traceable
    profile of her own business.
```

That last step is the point. VitalFlow does not just tell Amara she was declined — it tells her *why*, gives her something to hand back across the desk, and keeps working for her in the background.

---

## Why this is a build of *infrastructure*, not an *app*

The track brief from [Future Caribbean](https://futurecaribbean.com/tracks/financial) sets a clear bar: *"strong teams build financial infrastructure; weak teams build apps."* The judge-rubric for the same program allocates **50% of the final score to "Agentic AI Excellence"** — specifically: sophisticated agentic architecture, use of autonomous or semi-autonomous agents, multi-agent coordination, workflow orchestration, reasoning capability, and human-in-the-loop design.

Most teams in the Finance, Payments & MSME Capital track will build: *"Upload your bank statement, get a chart."* That is a tool, not infrastructure.

VitalFlow is built to be the **credit-legibility layer** for the Caribbean — the thing that sits between messy bank statements and the institutions that hold the capital. It is the same engine that:

- tells the **business owner** why their cash flow is fragile and what to fix
- tells the **lender** the business's risk profile, traceable to specific transactions
- and operates **over time** via semi-autonomous agents that watch the business, prepare funding packages, and follow up on lender engagement

One engine, two customers, three weeks to ship.

---

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| **Framework** | Next.js 15 (App Router) | Server components + route handlers in one deployable; fast to ship |
| **Language** | TypeScript (strict) | Money, currency, and dates are modelled explicitly — no `any` in a financial system |
| **Styling** | Tailwind CSS + shadcn/ui | Design tokens, no CSS drift, accessible primitives we own |
| **ORM** | Prisma | Typed schema shared between app and agents |
| **Database** | PostgreSQL (Neon) | Relational integrity for financial records; JSONB for evolving agent payloads |
| **LLM** | OpenAI-compatible API (Nebius Token Factory, primary) | Provider-agnostic interface; cost-efficient open models |
| **Parsing** | Papa Parse | Streaming CSV parser for messy real-world exports |
| **Charts** | Recharts | Composable, accessible, React-native |
| **PDF** | React-PDF | Deterministic, typeset, server-only |
| **Validation** | Zod | One schema for API contracts, agent I/O, and LLM structured output |
| **Auth** | NextAuth.js + Resend | Magic-link or Google OAuth, server-only |
| **Email** | Resend | Transactional, free tier, simple domain verification |
| **Testing** | Vitest + Playwright | Unit on the deterministic core; E2E on the upload-to-funding flow |
| **Hosting** | Vercel (Hobby tier) | Free for MVP, GitHub-native deploys, built-in cron |
| **Custom domain** | `vitalflow.haybee.xyz` (Cloudflare DNS → Vercel) | Free, judge-friendly URL |

---

## Repository Structure

```
VitalFlow/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Public landing pages
│   ├── (dashboard)/          # Authenticated product surface
│   │   ├── dashboard/        # Analysis list + overview
│   │   ├── analyses/         # Single analysis detail view
│   │   └── funding/          # Funding Outreach inbox
│   ├── (lender)/             # Mock lender decision-support dashboard
│   └── api/v1/               # Versioned route handlers (statements, analyses, funding, cron, webhooks)
│
├── agents/                   # The five agents + orchestrator
│   ├── orchestrator/         # Pipeline execution, checkpointing, retries, cron scheduling
│   ├── data-validation/
│   ├── transaction-analysis/
│   ├── financial-health/
│   ├── insight-generation/
│   ├── funding-outreach/     # The closed-loop agent
│   └── shared/               # Agent base contracts, AgentRun ledger, cost accounting
│
├── prompts/                  # Versioned system prompts (one file per LLM-using agent)
│
├── lib/                      # Framework-agnostic core
│   ├── csv/                  # Streaming parse, column inference, normalisation
│   ├── analysis/             # Deterministic financial mathematics
│   │   ├── money.ts          # BigInt minor-unit arithmetic
│   │   ├── cashflow.ts
│   │   ├── revenue.ts
│   │   ├── expenses.ts
│   │   ├── liquidity.ts
│   │   ├── recurring.ts
│   │   ├── anomalies.ts
│   │   └── score.ts          # Five-pillar composite
│   ├── llm/                  # Provider-agnostic LLM client + redaction
│   ├── pdf/                  # Report renderer
│   ├── funding/              # Caribbean funding program rules + eligibility
│   ├── email/                # Resend templates
│   └── db/                   # Prisma client + scoped repository helpers
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── charts/               # Recharts wrappers
│   ├── upload/               # Upload + column mapping flow
│   ├── report/               # Score, insight, funding outreach surfaces
│   └── marketing/
│
├── types/                    # Shared TypeScript contracts
├── prisma/                   # Schema + migrations
├── docs/                     # Architecture, agents, API, methodology, ADRs
├── public/                   # Static assets, brand
├── scripts/                  # Dev + operational scripts
├── tests/                    # Unit, contract, golden, adversarial, E2E
├── BUILD_CHECKPOINTS.md      # 22-day build plan
└── .github/                  # CI, issue templates, PR template
```

---

## Quickstart

The application is being implemented against the 22-day build plan in [BUILD_CHECKPOINTS.md](BUILD_CHECKPOINTS.md). For the current state of the code:

```bash
# 1. Clone
git clone https://github.com/hasbunallah01/VitalFlow.git
cd VitalFlow

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
#    → set DATABASE_URL, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL,
#      RESEND_API_KEY, RESEND_FROM_EMAIL, NEXTAUTH_SECRET

# 4. Start Postgres
docker compose up -d db

# 5. Apply the schema
npx prisma migrate dev

# 6. Run
npm run dev
```

Open <http://localhost:3000>.

A sample statement for testing lives at [`tests/fixtures/sample-statement.csv`](tests/fixtures/sample-statement.csv). The golden-file test asserts the expected **63/100** on this statement.

---

## Roadmap (22-day build sprint → submission Aug 30, 2026)

| Phase | Status | Scope |
| --- | --- | --- |
| **Phase 0** ✅ | **Done** | Documentation, architecture, agent contracts, scoring methodology, scaffolding |
| **Phase 1** 🔨 | **Building** | End-to-end MVP: CSV in → score out → funding outreach → lender API, in 22 days |
| **Phase 2** | Planned | Multi-statement history, period comparison, benchmarks, saved analyses, auth polish |
| **Phase 3** | Planned | The credit layer: consent-based lender sharing, standardised underwriting profile, partner API |
| **Phase 4** | Planned | Connected data: bank / Open Banking / mobile money integrations, continuous monitoring |
| **Phase 5** | Planned | Always-on: autonomous monitoring agents, anomaly alerts, forward-looking cash-flow forecasting |

Detailed, dated breakdown: **[BUILD_CHECKPOINTS.md](BUILD_CHECKPOINTS.md)** · [docs/ROADMAP.md](docs/ROADMAP.md)

---

## Why VitalFlow

Across the Caribbean, an MSME that has never been declined a loan is rare. Across the Caribbean, an MSME whose bank actually *understood* their financial story is rarer still. The capital is not missing. The data is not missing. The legibility is.

VitalFlow is the layer that fixes the legibility — first for the owner, then for the lender. The math is auditable. The score is traceable. The agents are semi-autonomous within an approver pattern. The product is open source.

**The goal is not to give Amara a chart. The goal is to make her bank say yes.**

---

## Contributing

Contributions are welcome — especially bank statement format profiles, financial methodology review, and Caribbean localisation. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and read [docs/AGENTS.md](docs/AGENTS.md) before touching anything under `agents/` or `prompts/`.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Buildathon Context

VitalFlow is being built for the **FutureCaribbean 2026 Global Agentic AI Buildathon**, under the **Finance, Payments & MSME Capital** track. The build sprint runs Aug 9 – Aug 30, 2026, with submission at midnight AST on Aug 30. More detail: [docs/BUILDATHON.md](docs/BUILDATHON.md).

---

## Disclaimer

VitalFlow produces analytical and educational output. It is **not** financial, investment, legal, tax, or accounting advice, and it is not a substitute for a licensed professional. Analyses are derived solely from the transaction data supplied by the user and are only as complete as that data. Business decisions remain the responsibility of the business owner. VitalFlow does not hold funds, move money, or make credit decisions.

---

## License

Released under the [MIT License](LICENSE).
