<div align="center">

<img src="docs/assets/vitalflow-logo.svg" alt="VitalFlow" width="220" />

### Caribbean MSME Financial Health & Funding Infrastructure.

**VitalFlow turns a bank statement into a lender-ready credit profile — and keeps working for the business long after the upload.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0F766E.svg?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/status-backend%20live%2C%20frontend%20building-0F766E?style=flat-square)](BUILD_CHECKPOINTS.md)
[![FutureCaribbean 2026](https://img.shields.io/badge/FutureCaribbean-2026-0F766E?style=flat-square)](https://futurecaribbean.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-249%20passing-0EA5E9?style=flat-square)](BUILD_CHECKPOINTS.md)

[Live API](#live-api) · [What ships today](#what-ships-today) · [Architecture](docs/ARCHITECTURE.md) · [Agents](#the-three-live-agents) · [Roadmap](docs/ROADMAP.md) · [Build Tracker](BUILD_CHECKPOINTS.md)

</div>

---

## What VitalFlow is

VitalFlow is a **semi-autonomous Caribbean MSME financial infrastructure** that closes the legibility gap between messy bank statements and the institutions that hold capital. A business uploads a CSV; VitalFlow computes a deterministic 5-pillar health score, then a set of closed-loop agents keep working for the business — watching for material changes, drafting funding-outreach plans, and preparing lender-ready evidence packs.

The agents operate within the **Approver pattern**: they observe, decide, and act on their own initiative within a defined scope, but every consequential action — sending anything to a lender, sharing data, deleting records — pauses for the business owner's approval.

> The goal is not to give Amara a chart. The goal is to make her bank say yes.

---

## Live API

The backend is **live and deployed** to Vercel. Every route is production code, returns real data from a real Neon Postgres database, and the agents actually call real LLMs (Qwen 3 30B via Nebius Token Factory).

**Base URL:** `https://vitalflow-hj7u5pnlg-hasbunallah.vercel.app`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/dev/session` | dev user/org bootstrap |
| `GET` | `/api/analyses` | list org's analyses |
| `GET` | `/api/analyses/[id]` | full overview JSON (pillars, anomalies, monthly) |
| `POST` | `/api/upload` | upload CSV → runs full pipeline including the orchestrator |
| `POST` | `/api/agents/run` | manual agent trigger, optional `{agents: ["watcher","insight","funding"]}` filter |
| `GET` | `/api/audit` | queryable timeline — every agent run, watch event, recommendation, funding outreach |

**Try it in 30 seconds:**

```bash
# Upload a real bank statement
curl -X POST -F "file=@tests/fixtures/sample-statement.csv" \
  https://vitalflow-hj7u5pnlg-hasbunallah.vercel.app/api/upload

# → analysisId, score 75.4/100, 3 AgentRun rows, 2 Recommendations,
#   1 FundingOutreach draft, all persisted in <10 seconds
```

The sample CSV in `tests/fixtures/sample-statement.csv` (230 rows, 12 months, XCD) returns the **golden 75.4/100 Healthy** score every time — verified locally, on CI, and on the live Vercel deployment.

---

## What ships today

- ✅ **End-to-end backend** — 6 serverless API routes, deterministic + LLM-routed
- ✅ **Deterministic 5-pillar scoring** — `lib/analysis/score.ts`, 240+ tests, golden 75.4/100
- ✅ **Three live agents** — Watcher, Insight Generation, Funding Outreach, each backed by real Qwen 3 30B calls
- ✅ **Orchestrator** — wires the three agents into one real workflow that fires on upload and on manual trigger
- ✅ **Audit trail** — every AgentRun, WatchEvent, Recommendation, FundingOutreach row is queryable via `/api/audit`
- ✅ **Approver state machine** — `drafted → approved → shared → viewed → completed` with `revoked`/`failed`, library code in `lib/db/persist-funding.ts`
- ✅ **Caribbean funding program catalog** — 7 hand-coded programs (DBJ ORBIT, DBJ AFI, DBJ M5, CDB PROPEL, CDB T&T DFL, IDB Invest IPED, CDB LC MSME) with eligibility, gap analysis, and blocker reasons
- ✅ **Lender-facing credit profile API** — read endpoint, share-link token, evidence pack builder
- ✅ **Live on Vercel** — auto-deploy on push to main, 4 env vars set
- ✅ **249/249 tests passing** — mocked + real DB + live LLM
- 🟡 **Frontend** — building next (this is the current focus)

---

## The core design principle: **Deterministic core, AI narrative**

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
- ❌ Not a one-shot tool — it does not stop at the report
- ❌ Not autonomous in a way that takes consequential actions without a human

---

## The Three Live Agents

VitalFlow is built as a **pipeline of narrow agents**, each with exactly one responsibility, each with a typed input and output contract, each independently testable. Three of them are live in production; the orchestrator wires them together.

| # | Agent | LLM? | Responsibility | Source |
| --- | --- | --- | --- | --- |
| 1 | 🛡️ **Watcher** | Optional (event narrative) | Observe material changes in the business's financial story and emit `WatchEvent`s | `agents/watcher/` |
| 2 | 💡 **Insight Generation** | **Yes — primary** | Turn numbers into ranked, quantified, prioritised recommendations | `agents/recommendation/` |
| 3 | 🤝 **Funding Outreach** | **Yes — planning only** | **Close the loop with the outside world** — match to Caribbean programs, draft evidence packs, propose share links | `agents/funding-outreach/` |
| 4 | 🎼 **Orchestrator** | n/a | The conductor — runs all three agents, persists their outputs, writes the audit ledger | `lib/orchestrator/` |

**The first three are a pipeline. The Funding Outreach Agent is a closed loop.** When the pipeline completes, the Funding Outreach Agent wakes up, observes the result, plans a funding outreach, and either asks the business owner to approve a consequential action (sending an evidence pack to a lender) or executes an observable action automatically (writing to the system of record). It is the system's way of *continuing* to work after the analysis is done.

See [docs/AGENTS.md](docs/AGENTS.md) for contracts, prompts, guardrails, and failure modes.

---

## Semi-Autonomous Behavior

VitalFlow is not "always on" in the way a trading bot is always on. There is no continuous bank-data feed in the Caribbean. But it is **always-on in the way a smart security camera is always-on** — it wakes up on a schedule, on an event, or on a user action, and does things without being asked.

| Trigger | Agent | What it does | Approval required? |
| --- | --- | --- | --- |
| **New analysis uploaded** | Orchestrator | Runs all 3 agents → writes AgentRun + WatchEvent + Recommendation + FundingOutreach | No (observable only) |
| **Manual button in the UI** (`POST /api/agents/run`) | Any subset | Lets the owner trigger agents on demand, for the demo or for ad-hoc re-evaluation | Varies |
| **Vercel cron, daily 9am** (planned) | 🛡️ Watcher | Compares last analysis to the business's history. If anything material changed, writes a `WatchEvent` and emails the owner. | No (observable only) |
| **Vercel cron, weekly Mon 9am** (planned) | 🤝 Matchmaker | If the business's profile now meets a funding program's eligibility rules, drafts a `FundingOutreach` plan and emails the owner. | **Yes — before any send** |
| **Webhook: lender opens share link** (planned) | 👁️ Lender Access Monitor | Updates `ShareLink.accessCount`, transitions `FundingOutreach.status` to `viewed`, notifies the business. | No (observable only) |
| **New analysis uploaded** | 🔄 Delta Agent | Compares new analysis to the previous one, surfaces "what changed since last time". | No (observable only) |

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
| 🌍 | **Multi-currency** | XCD, TTD, JMD, BBD, GYD, NGN, USD and more — currency-explicit BigInt arithmetic from the first commit |
| 📜 | **Append-only audit ledger** | Every agent run, every access, every consequential decision — recorded forever |

---

## Example User Workflow

**Meet Amara.** She runs a five-person catering business in Antigua. She banks with a local bank, has no accountant, and was declined for a working-capital loan last month with no explanation.

```
 1. Amara exports 12 months of transactions from her online banking as CSV.

 2. She signs up at vitalflow.haybee.xyz, creates her business profile,
    and drops the file into VitalFlow.
    → The Data Validation Agent detects the column layout, normalises 230
      transactions, flags 0 unparseable dates, and confirms the currency is XCD.

 3. She clicks "Analyse".
    → The pipeline runs. She watches each agent complete in real time:
      validated → analysed → scored → interpreted → outreach.  (~10 seconds)

 4. She gets her assessment:

    ┌─────────────────────────────────────────────────────────────┐
    │  FINANCIAL HEALTH SCORE                                     │
    │                                                             │
    │              75 / 100    ·   HEALTHY                        │
    │                                                             │
    │  Cash Flow Stability      ████████░░  20 / 25               │
    │  Revenue Quality          ████████░░  20 / 25               │
    │  Expense Discipline       ████████░░  16 / 20               │
    │  Liquidity & Runway       ██████░░░░  12 / 20               │
    │  Risk Profile             ████████░░   7 / 10               │
    └─────────────────────────────────────────────────────────────┘

 5. She reads what it actually means — 2 prioritised recommendations,
    each quantified, each written by the LLM but grounded in real numbers:

    ▸ "Set up auto-pay for recurring bills" — priority 2, ~2pt to risk
      "Two bounced payments hurt your credit and can trigger fees,
       risking your business's health."

    ▸ "Diversify your customer base" — priority 2, ~4.5pt to revenue
      "Your top customer makes up 42% of sales, which is risky — if
       they leave, your business could..."

 6. The system keeps going. The Funding Outreach Agent drafted a plan:

    ┌─────────────────────────────────────────────────────────────┐
    │  FUNDING OUTREACH PLAN                                      │
    │                                                             │
    │  Based on your current profile, you are eligible for:       │
    │                                                             │
    │   ▸ CDB Caribbean Development Bank — PROPEL                 │
    │     (eligible: score, all sector, all jurisdictions)        │
    │   ▸ DBJ AFI — Working Capital (blocked: Jamaica only)      │
    │   ▸ CDB T&T DFL (blocked: Trinidad only)                    │
    │                                                             │
    │  Headline: "Grant-funded technical assistance up to         │
    │  $250K for AG service businesses to boost growth..."        │
    │                                                             │
    │  Evidence pack prepared. Awaiting your approval to share.   │
    │                                                             │
    │            [  Approve & send  ]  [  Modify  ]  [  Reject  ] │
    └─────────────────────────────────────────────────────────────┘

 7. (Future) Amara approves. The system creates a ShareLink, writes a
    FundingOutreach row, emails the lender. A few days later, the
    lender opens the link twice. VitalFlow sees it and emails Amara:

    "The lender viewed your packet 2 times this week. They looked at
     your score and your cash flow chart. Want to follow up?"

 8. (Future) Amara comes back next month and uploads a fresh statement.
    The Watcher fires automatically and writes a WatchEvent.
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
| **Styling** | Tailwind CSS 3.4 | Design tokens, no CSS drift, accessible primitives we own |
| **ORM** | Prisma 6 | Typed schema shared between app and agents |
| **Database** | PostgreSQL (Neon) | Relational integrity for financial records; JSONB for evolving agent payloads |
| **LLM** | OpenAI-compatible API (Nebius Token Factory, primary) | Provider-agnostic interface; cost-efficient open models. Default: Qwen 3 30B |
| **Parsing** | Papa Parse | Streaming CSV parser for messy real-world exports |
| **Charts** | Recharts 2.13 | Composable, accessible, React-native |
| **PDF** | React-PDF (planned) | Deterministic, typeset, server-only |
| **Validation** | Zod | One schema for API contracts, agent I/O, and LLM structured output |
| **Auth** | NextAuth.js + Resend (planned) | Magic-link or Google OAuth, server-only |
| **Email** | Resend (planned) | Transactional, free tier, simple domain verification |
| **Testing** | Vitest | Unit on the deterministic core; mocked + live-LLM contract tests for agents |
| **Hosting** | Vercel (Hobby tier) | Free for MVP, GitHub-native deploys, built-in cron |
| **Custom domain** | `vitalflow.haybee.xyz` (Cloudflare DNS → Vercel) | Free, judge-friendly URL |

---

## Repository Structure

```
VitalFlow/
├── app/                            # Next.js App Router
│   ├── (marketing)/                # Public landing pages (planned)
│   ├── (dashboard)/                # Authenticated product surface (planned)
│   │   ├── dashboard/              # Analysis list + overview
│   │   ├── insights/               # Recommendations tab
│   │   ├── funding/                # Funding Outreach inbox
│   │   └── audit/                  # Agent-run audit trail
│   ├── lender/[token]/             # Public lender view (planned)
│   └── api/                        # 6 live route handlers
│       ├── dev/session/            #   dev user/org bootstrap
│       ├── upload/                 #   CSV → pipeline → orchestrator
│       ├── analyses/               #   list org's analyses
│       ├── analyses/[id]/          #   single analysis JSON
│       ├── agents/run/             #   manual agent trigger
│       └── audit/                  #   queryable timeline
│
├── agents/                         # The 3 live agents + 7 placeholders
│   ├── watcher/                    # 🛡️ Live — WatcherAgent
│   ├── recommendation/             # 💡 Live — InsightGenerationAgent
│   ├── funding-outreach/           # 🤝 Live — FundingOutreachAgent
│   ├── data-validation/            #   README-only (CSV parsing in lib/csv/)
│   ├── transaction-analysis/       #   README-only (categorisation in lib/csv/)
│   ├── financial-health/           #   README-only (deterministic scoring in lib/analysis/)
│   ├── insight-generation/         #   README-only (see recommendation/)
│   ├── report-generation/          #   README-only (PDF in lib/pdf/, planned)
│   ├── orchestrator/               #   README-only (real one in lib/orchestrator/)
│   └── shared/                     #   README-only
│
├── lib/                            # Framework-agnostic core
│   ├── csv/                        # Streaming parse, column inference, normalisation
│   ├── analysis/                   # Deterministic financial mathematics
│   │   ├── money.ts                #   BigInt minor-unit arithmetic
│   │   ├── cashflow.ts
│   │   ├── revenue.ts
│   │   ├── expenses.ts
│   │   ├── liquidity.ts
│   │   ├── recurring.ts
│   │   ├── anomalies.ts
│   │   └── score.ts                #   Five-pillar composite
│   ├── llm/                        # Provider-agnostic LLM client + MockLLMClient for tests
│   ├── funding/                    # Caribbean funding program rules + eligibility + evidence pack
│   ├── orchestrator/               # The conductor (Watcher + Insight + Funding → DB)
│   ├── pdf/                        # Report renderer (planned, currently empty)
│   ├── auth/                       # Dev user bootstrap (NextAuth planned)
│   └── db/                         # Prisma client + scoped repository helpers
│
├── prompts/                        # Versioned system prompts (one file per LLM-using agent)
│
├── components/                     # React components (planned — currently empty)
│
├── prisma/                         # Schema + 20 migrations
├── docs/                           # Architecture, agents, API, methodology, ADRs
├── tests/                          # 249 tests — unit, contract, golden, adversarial, live
│   └── fixtures/                   #   sample-statement.csv (golden 75.4/100)
├── BUILD_CHECKPOINTS.md            # 22-day build plan
└── .github/                        # CI, issue templates, PR template
```

---

## Quickstart

The backend is live; the frontend is the next phase. To run the backend locally:

```bash
# 1. Clone
git clone https://github.com/hasbunallah01/VitalFlow.git
cd VitalFlow

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
#    → set DATABASE_URL (Neon pooler URL), LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
#      No RESEND/NEXTAUTH needed yet — those are deferred to Checkpoint 7 (polish)

# 4. Apply the schema
npx prisma migrate deploy

# 5. Run
npm run dev

# 6. Test
npm test                                          # 249 tests
DATABASE_URL=... NEBIUS_API_KEY=... \
  npm test -- -t "orchestrator live"              # 1 live LLM test (~12s)
```

A sample statement for testing lives at [`tests/fixtures/sample-statement.csv`](tests/fixtures/sample-statement.csv). The golden-file test asserts the expected **75.4/100** on this statement.

---

## Roadmap (FutureCaribbean 2026 build sprint)

| Phase | Status | Scope |
| --- | --- | --- |
| **Phase 0** ✅ | **Done** | Documentation, architecture, agent contracts, scoring methodology |
| **Phase 1** ✅ | **Backend shipped** | CSV in → score out → funding outreach → lender API. 6 live API routes, 3 live agents, orchestrator connected. 249/249 tests. Live on Vercel. |
| **Phase 2** 🔨 | **Building now** | Frontend UI — upload flow, agentic dashboard, audit trail tab, lender view |
| **Phase 3** | Planned | Approver HTTP routes (approve/revoke/share), cron-driven agent runs, Resend email |
| **Phase 4** | Planned | React-PDF evidence pack, lender-facing public page, NextAuth |
| **Phase 5** | Planned | Multi-statement history, period comparison, benchmarks, saved analyses, auth polish |
| **Phase 6** | Planned | Tavily-backed live funding-program research, partner API, continuous monitoring |

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

VitalFlow is being built for the **FutureCaribbean 2026 Global Agentic AI Buildathon**, under the **Finance, Payments & MSME Capital** track. Build sprint Jul 17 – Aug 7, submissions reviewed Aug 8–15, semi-finalist interviews Aug 16–22, **winners announced Sept 1**. The judging rubric is **50% Business Strength + 50% Agentic AI Excellence**. More detail: [docs/BUILDATHON.md](docs/BUILDATHON.md).

---

## Disclaimer

VitalFlow produces analytical and educational output. It is **not** financial, investment, legal, tax, or accounting advice, and it is not a substitute for a licensed professional. Analyses are derived solely from the transaction data supplied by the user and are only as complete as that data. Business decisions remain the responsibility of the business owner. VitalFlow does not hold funds, move money, or make credit decisions.

---

## License

Released under the [MIT License](LICENSE).
