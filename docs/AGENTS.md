# Agents

> The contract specification for VitalFlow's analysis pipeline. Read this before modifying anything under `agents/` or `prompts/`.

---

## Philosophy

VitalFlow's agents are **narrow specialists in a fixed pipeline**, not a swarm of autonomous generalists negotiating with each other. That is a deliberate choice for a financial system:

- A credit decision derived from an unrepeatable multi-agent conversation is not defensible.
- Narrow agents with typed contracts can be unit-tested against fixtures.
- Failures are localised and attributable.

Every agent obeys the same five rules:

1. **One responsibility.** If you can't state it in a sentence, it's two agents.
2. **Typed in, typed out.** Contracts live in `types/` and are enforced with Zod at the boundary.
3. **No sideways reads.** An agent may only read the output of the agent before it.
4. **Deterministic where possible.** Reach for an LLM only where judgement or language is genuinely required.
5. **Always accountable.** Every execution writes an `AgentRun` record.

### Shared base contract

```ts
interface AgentContext {
  analysisId: string;
  organizationId: string;
  currency: CurrencyCode;
  locale: string;
  budget: { maxTokens: number; maxDurationMs: number };
  logger: Logger;
}

interface AgentResult<T> {
  ok: boolean;
  data?: T;
  warnings: AgentWarning[];
  errors: AgentError[];
  confidence: number;          // 0–1, propagated to the final report
  meta: {
    agent: string;
    agentVersion: string;
    promptId?: string;         // e.g. "insight-generation@v1"
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    durationMs: number;
  };
}

interface Agent<TIn, TOut> {
  name: string;
  version: string;
  usesLLM: boolean;
  run(input: TIn, ctx: AgentContext): Promise<AgentResult<TOut>>;
}
```

**Confidence propagates.** If validation is only 0.6 confident in its column mapping, no downstream insight may be presented as certain. The final report surfaces an overall confidence band.

---

## Pipeline at a glance

| # | Agent | LLM? | Typical duration | Fails the pipeline? |
| --- | --- | --- | --- | --- |
| 1 | Data Validation | Optional (ambiguity only) | < 2s | Yes — bad data in, nothing out |
| 2 | Transaction Analysis | Optional (categorisation fallback) | < 3s | Yes |
| 3 | Financial Health | No | < 500ms | Yes |
| 4 | Insight Generation | **Yes** | 5–20s | No — degrades gracefully |
| 5 | Report Generation | No | 2–6s | No — dashboard still available |

---

## 1. 🛡️ Data Validation Agent

**Responsibility:** turn an untrusted CSV into a trustworthy, typed transaction set — or refuse, with a precise reason.

**Directory:** `agents/data-validation/`

### Input

```ts
interface DataValidationInput {
  statementId: string;
  fileRef: string;              // object storage reference
  declaredCurrency?: CurrencyCode;
  columnMapping?: ColumnMapping; // supplied on re-run after AWAITING_INPUT
}
```

### Output

```ts
interface ValidatedStatement {
  transactions: Transaction[];        // normalised, immutable
  period: { start: ISODate; end: ISODate; months: number };
  currency: CurrencyCode;
  columnMapping: ColumnMapping;
  hasBalanceColumn: boolean;
  quality: DataQualityReport;
}

interface DataQualityReport {
  rowsRead: number;
  rowsAccepted: number;
  rowsRejected: RejectedRow[];        // with row number and reason
  duplicatesRemoved: number;
  dateFormatDetected: string;
  gapsDetected: DateRange[];          // periods with no activity at all
  balanceContinuityOk: boolean | null;
  completenessScore: number;          // 0–1
  warnings: string[];
}
```

### What it does

1. **Detect** encoding, delimiter, quoting, header row, and trailing junk rows (bank exports frequently include footers).
2. **Infer column roles** — date, description, debit, credit, single signed amount, balance, reference, counterparty. Scored by header-name matching *and* value-shape analysis, because headers are often absent or unhelpful.
3. **Normalise dates.** Resolve `DD/MM` vs `MM/DD` ambiguity across the whole file, not row by row. If unresolvable, escalate.
4. **Normalise amounts** to integer minor units. Handle parentheses negatives, thousands separators, currency symbols, `CR`/`DR` suffixes.
5. **Deduplicate** exact repeats within the same day/amount/description.
6. **Verify balance continuity** where a balance column exists — a powerful integrity check that catches partial exports.
7. **Assess period coverage.** Fewer than three months is analysable but flagged as low confidence; fewer than 30 days is rejected.
8. **Escalate to the user** when column or currency confidence is below threshold, rather than guessing.

### Guardrails

- Hard row cap (default 50,000) and file size cap.
- Never silently drop more than 5% of rows — exceed that and the analysis stops with an explanation.
- Rejects a statement where inflows and outflows cannot be distinguished at all.

### Failure modes

| Condition | Behaviour |
| --- | --- |
| Unparseable file / not a CSV | `VALIDATION_FAILED` with a human-readable reason |
| Column roles ambiguous | `AWAITING_INPUT` — user confirms mapping in the UI |
| Date format ambiguous across file | `AWAITING_INPUT` — user picks the format |
| Period < 30 days | `VALIDATION_FAILED` — insufficient data for a health assessment |
| > 5% rows rejected | `VALIDATION_FAILED` with the rejection breakdown |
| No balance column | Proceed; `hasBalanceColumn: false` reduces liquidity-pillar confidence |

---

## 2. 🔍 Transaction Analysis Agent

**Responsibility:** find the structure hidden in a flat list of transactions.

**Directory:** `agents/transaction-analysis/`

### Input

`ValidatedStatement`

### Output

```ts
interface TransactionAnalysis {
  categorized: CategorizedTransaction[];
  categories: CategorySummary[];          // share of inflow/outflow, trend
  recurring: RecurringSeries[];
  counterparties: CounterpartyProfile[];  // clustered, with inflow/outflow totals
  monthly: MonthlyAggregate[];            // the backbone of every trend metric
  transfers: TransferPair[];              // internal movements, excluded from revenue
  coverage: { categorizedShare: number };
}

interface RecurringSeries {
  label: string;
  direction: 'inflow' | 'outflow';
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'irregular';
  medianAmount: Money;
  amountVariance: number;
  occurrences: string[];      // transaction IDs
  confidence: number;
  lastSeen: ISODate;
  isActive: boolean;          // still running at end of period?
}
```

### What it does

1. **Normalise descriptions** — strip reference numbers, dates, terminal IDs, card masks.
2. **Cluster counterparties** by normalised description similarity, so "ACME LTD 4471", "ACME LIMITED" and "ACME LTD/INV22" are one payer.
3. **Categorise** using a deterministic rule set first (merchant patterns, keywords, MCC-like heuristics). Only unmatched, material transactions go to the LLM in a batched, low-cost pass.
4. **Detect recurring series** by clustering on counterparty + amount band, then testing inter-arrival intervals for periodicity.
5. **Identify internal transfers** — own-account movements that must never be counted as revenue or expense. This is one of the most common sources of wildly wrong small-business analysis.
6. **Aggregate monthly** — inflow, outflow, net, closing balance, transaction count, unique counterparties.

### Guardrails

- LLM categorisation is capped by count and token budget; it never sees full descriptions containing account numbers.
- Any category assigned by the LLM is recorded as `source: 'llm'` and is separable from rule-based assignments in audit.
- A transaction unclassified after both passes is `uncategorized`, not force-fitted. `coverage.categorizedShare` is reported honestly.

### Failure modes

| Condition | Behaviour |
| --- | --- |
| LLM unavailable | Rule-based categorisation only; coverage drops; warning recorded |
| Categorised share < 60% | Warning surfaced in the report; expense-pillar confidence reduced |
| No detectable recurring series | Valid outcome — reported as an insight in itself (revenue unpredictability) |

---

## 3. 🩺 Financial Health Agent

**Responsibility:** quantify the condition of the business. **Fully deterministic — no LLM.**

**Directory:** `agents/financial-health/`

### Input

`ValidatedStatement` + `TransactionAnalysis`

### Output

```ts
interface HealthAssessment {
  score: number;                       // 0–100
  band: 'Critical' | 'Fragile' | 'Watch' | 'Healthy' | 'Strong';
  pillars: PillarScore[];              // score, max, contributing metrics, confidence
  metrics: MetricSet;                  // every computed figure, named and unit-tagged
  riskFlags: RiskFlag[];               // severity, evidence, affected transactions
  runwayMonths: number | null;
  fundingReadiness: {
    tier: 'Not Ready' | 'Building' | 'Near Ready' | 'Ready';
    blockers: Blocker[];               // each with the change that would clear it
    strengths: string[];
  };
  confidence: number;
}
```

### The five pillars

| Pillar | Weight | Measures |
| --- | --- | --- |
| Cash Flow Stability | 25 | Net-flow consistency, negative months, volatility, drawdowns |
| Revenue Quality & Predictability | 25 | Growth trend, variability, recurring share, customer concentration |
| Expense Discipline | 20 | Expense growth vs revenue growth, fixed/variable balance, discretionary share |
| Liquidity & Runway | 20 | Average buffer, burn rate, months of runway, days cash on hand |
| Risk Profile | 10 | Overdrafts, returned payments, anomalies, structural breaks |

Formulae, thresholds, and band definitions: **[SCORING_METHODOLOGY.md](SCORING_METHODOLOGY.md)**.

### Guardrails

- Pure functions only. Same input, same output, forever.
- Where a metric cannot be computed (e.g. no balance column → no true runway), the pillar is scored on available sub-metrics and its **confidence is reduced and reported**. It is never imputed silently.
- Every metric carries a unit and a currency where applicable.

---

## 4. 💡 Insight Generation Agent

**Responsibility:** turn numbers into meaning, priority, and action. **This is where the LLM earns its place.**

**Directory:** `agents/insight-generation/` · **Prompt:** `prompts/insight-generation.system.md`

### Input

`HealthAssessment` + selected aggregates from `TransactionAnalysis` (redacted)

### Output

```ts
interface InsightSet {
  narrative: {
    headline: string;              // one sentence: the single most important thing
    summary: string;               // 3–5 sentences, plain language, no jargon
    cashFlowStory: string;
    revenueStory: string;
    expenseStory: string;
  };
  insights: Insight[];
  recommendations: Recommendation[];
  fundingNarrative: string;
  confidenceNote: string | null;   // stated when data quality limits conclusions
}

interface Insight {
  id: string;
  title: string;
  explanation: string;
  severity: 'info' | 'watch' | 'concern' | 'critical';
  sourceMetrics: string[];         // REQUIRED — provenance
  evidenceTransactionIds?: string[];
}

interface Recommendation {
  id: string;
  action: string;                  // specific and executable
  rationale: string;
  priority: 1 | 2 | 3;
  effort: 'low' | 'medium' | 'high';
  expectedImpact: {
    pillar: PillarId;
    estimatedPointGain: number;    // computed deterministically, not by the model
    description: string;
  };
  timeframe: 'immediate' | '30 days' | '90 days';
}
```

### What it does

1. Receives **only computed metrics and aggregates** — never raw transactions.
2. Produces explanation, ranking, and recommendation under a strict JSON schema.
3. Every insight must cite `sourceMetrics`. An insight without provenance is rejected at validation.
4. Recommendation impact estimates are **computed by re-running the deterministic scorer** against the projected metric change — the model proposes the action, the core quantifies the effect.

### Guardrails

- **Numeric fidelity check:** any number appearing in generated text must match a value in the supplied context (within rounding tolerance). Violations cause a single retry, then that field is dropped.
- **No advice outside scope.** The prompt forbids investment, tax, and legal recommendations, and forbids promising specific lending outcomes.
- **No fabricated causes.** The model may say revenue is concentrated; it may not invent *why* a client paid late.
- **Tone contract:** direct, non-alarmist, non-flattering. A struggling business is told plainly; a healthy one is not congratulated into complacency.
- Temperature ≤ 0.4. Structured output enforced.

### Failure modes

| Condition | Behaviour |
| --- | --- |
| LLM unavailable / times out | Pipeline enters `DEGRADED`: metrics, score, and charts are delivered without narrative |
| Schema validation fails | One retry with the validation error appended; then degrade |
| Numeric fidelity violation | Offending field dropped, warning logged, remainder retained |

---

## 5. 📑 Report Generation Agent

**Responsibility:** assemble everything into a single shareable artifact.

**Directory:** `agents/report-generation/`

### Input

`ValidatedStatement` + `TransactionAnalysis` + `HealthAssessment` + `InsightSet`

### Output

```ts
interface GeneratedReport {
  reportId: string;
  model: ReportModel;        // structured, renderer-agnostic
  pdfRef: string;            // object storage reference
  pages: number;
  generatedAt: ISODateTime;
  disclaimerVersion: string;
}
```

### Report structure

```
1. Cover              Business, period, currency, score, band, generation date
2. Executive summary  Headline + narrative summary
3. Health score       Composite + pillar breakdown with contributing metrics
4. Cash flow          Monthly inflow/outflow chart, net flow, negative months, runway
5. Revenue            Trend, predictability, recurring share, concentration
6. Expenses           Category breakdown, fixed vs variable, growth vs revenue
7. Risk indicators    Flags with severity and evidence
8. Funding readiness  Tier, blockers, strengths, what a lender would see
9. Recommendations    Ranked, with effort and expected impact
10. Methodology       How the score was computed, data quality, confidence, disclaimer
```

Section 10 is not optional. A financial report that does not disclose its own method and limitations is not trustworthy.

### Guardrails

- Deterministic rendering: same inputs produce a byte-comparable document (excluding the timestamp).
- Charts are rendered server-side, not screenshotted from the UI.
- If the analysis is `DEGRADED`, the report says so on the cover.
- The disclaimer is versioned and recorded on the report record.

---

## Orchestrator

**Directory:** `agents/orchestrator/`

Responsibilities:

- Sequence agents and enforce the state machine
- Persist a checkpoint after every stage; resume from the last good one
- Enforce per-agent time and token budgets
- Retry with backoff on transient errors; never retry a deterministic failure
- Emit progress events to the SSE stream
- Aggregate cost and duration onto the `Analysis` record

The orchestrator knows the *sequence*. It does not know what any agent does internally.

---

## Prompt management

- One versioned file per LLM-using agent in `prompts/`, named `<agent>.system.md`.
- Every prompt declares an ID in its front matter (`insight-generation@v1`). Bump the version for any change that could alter output.
- The prompt ID is recorded on every `AgentRun`, so any historical output can be reproduced exactly.
- Prompt changes require a PR with before/after output on the standard fixture set. See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Testing strategy

| Level | Target |
| --- | --- |
| **Unit** | Every function in `lib/analysis/` — 90%+ coverage |
| **Contract** | Each agent against fixture inputs, asserting output schema and key invariants |
| **Golden file** | Full pipeline over fixture statements; deterministic outputs diffed against committed snapshots |
| **Adversarial** | Malformed CSVs, hostile column names, prompt injection in transaction descriptions, extreme values, single-transaction statements |
| **E2E** | Upload → analysis → report download |

> **Prompt injection is a real ingestion risk.** Transaction descriptions are attacker-controllable — anyone can set a payment reference. All description text passed to a model is treated as untrusted data, delimited, and explicitly marked as non-instructional in the system prompt.
