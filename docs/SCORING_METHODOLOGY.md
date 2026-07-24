# Financial Health Score — Methodology

> Public by design. A score a business cannot interrogate is a score it cannot act on, and a score a lender cannot inspect is a score they will not trust.

---

## Overview

The **VitalFlow Financial Health Score** is a composite value from **0 to 100**, built from five weighted pillars. It is computed entirely in deterministic TypeScript (`lib/analysis/score.ts`). No language model participates in producing it.

```
Score = Σ (pillar_score)    where Σ (pillar_max) = 100
```

| Pillar | Weight | Question it answers |
| --- | --- | --- |
| Cash Flow Stability | **25** | Is money moving through the business consistently? |
| Revenue Quality & Predictability | **25** | Can this business rely on its income next month? |
| Expense Discipline | **20** | Are costs under control relative to income? |
| Liquidity & Runway | **20** | How long can the business survive a shock? |
| Risk Profile | **10** | Are there warning signs in the account behaviour? |

### Bands

| Range | Band | Interpretation |
| --- | --- | --- |
| 85–100 | **Strong** | Stable, predictable, resilient. Fundable on cash flow. |
| 70–84 | **Healthy** | Fundamentally sound with identifiable improvements. |
| 55–69 | **Watch** | Functional but with real vulnerabilities that will constrain growth or funding. |
| 40–54 | **Fragile** | Material structural weakness. Shock-sensitive. |
| 0–39 | **Critical** | Acute distress signals. Immediate intervention warranted. |

### Weighting rationale

Cash flow and revenue quality dominate because **cash flow failure, not unprofitability, is what actually kills small businesses**. A business can be profitable on paper and still fail because income arrives unpredictably while obligations arrive on schedule. Liquidity is weighted heavily but below revenue because it is a *symptom* — a business with strong, predictable revenue tends to rebuild a buffer, whereas a business with a buffer and erratic revenue merely fails later.

Risk Profile carries the lowest weight because its signals are binary and rare; when they fire, they fire hard, and they surface prominently as flags regardless of their point contribution.

---

## Pillar 1 — Cash Flow Stability (25 points)

| Sub-metric | Points | Definition |
| --- | --- | --- |
| Net flow positivity | 8 | Share of months with net inflow ≥ 0 |
| Net flow volatility | 7 | Coefficient of variation of monthly net flow |
| Consecutive negative months | 5 | Longest run of negative net-flow months |
| Balance drawdown | 5 | Largest peak-to-trough decline in closing balance |

```
positivity      = months_net_positive / total_months
cv_net_flow     = σ(monthly_net_flow) / |μ(monthly_net_flow)|
max_drawdown    = max((peak_balance − trough_balance) / peak_balance)
```

**Scoring curves**

| Metric | Full points | Zero points |
| --- | --- | --- |
| Positivity | ≥ 0.85 | ≤ 0.40 |
| CV of net flow | ≤ 0.35 | ≥ 1.50 |
| Consecutive negative months | 0 | ≥ 4 |
| Max drawdown | ≤ 15% | ≥ 60% |

Intermediate values are interpolated linearly, then clamped. All thresholds live in a single `SCORING_CONFIG` constant so they can be recalibrated without touching logic.

> **Degradation:** without a balance column, the drawdown sub-metric cannot be computed. Its 5 points are redistributed proportionally across the other three sub-metrics and pillar confidence drops to ≤ 0.75.

---

## Pillar 2 — Revenue Quality & Predictability (25 points)

| Sub-metric | Points | Definition |
| --- | --- | --- |
| Revenue trend | 7 | Normalised OLS slope of monthly revenue |
| Revenue variability | 7 | Coefficient of variation of monthly revenue |
| Recurring revenue share | 6 | Share of inflow from detected recurring series |
| Customer concentration | 5 | Herfindahl–Hirschman Index over counterparty inflow share |

```
trend       = OLS_slope(monthly_revenue) / μ(monthly_revenue)   # monthly growth rate
cv_revenue  = σ(monthly_revenue) / μ(monthly_revenue)
recurring   = Σ(recurring_inflow) / Σ(total_inflow)
HHI         = Σ (share_i)²        for each counterparty i
```

| Metric | Full points | Zero points |
| --- | --- | --- |
| Trend | ≥ +2% / month | ≤ −3% / month |
| CV of revenue | ≤ 0.25 | ≥ 1.00 |
| Recurring share | ≥ 0.50 | ≤ 0.05 |
| HHI | ≤ 0.15 (diversified) | ≥ 0.50 (highly concentrated) |

**Internal transfers are excluded from revenue.** Counting an owner's own transfer between accounts as income is the single most common way naive analysis overstates a small business's health. Detection happens upstream in the Transaction Analysis Agent.

---

## Pillar 3 — Expense Discipline (20 points)

| Sub-metric | Points | Definition |
| --- | --- | --- |
| Expense growth vs revenue growth | 8 | Operating leverage |
| Fixed cost coverage | 5 | Revenue ÷ recurring fixed obligations |
| Expense volatility | 4 | Coefficient of variation of monthly outflow |
| Discretionary share | 3 | Discretionary spend ÷ total outflow |

```
leverage_gap = revenue_growth_rate − expense_growth_rate
fixed_cover  = μ(monthly_revenue) / μ(monthly_fixed_obligations)
```

| Metric | Full points | Zero points |
| --- | --- | --- |
| Leverage gap | ≥ +3 pp | ≤ −5 pp |
| Fixed cost coverage | ≥ 2.5× | ≤ 1.0× |
| CV of outflow | ≤ 0.30 | ≥ 1.00 |
| Discretionary share | ≤ 10% | ≥ 35% |

The leverage gap carries the most weight because **expenses growing faster than revenue is the clearest early signal of a business quietly heading toward trouble** — and it is almost invisible to an owner watching only their balance.

> **Degradation:** if categorisation coverage is below 60%, the discretionary-share sub-metric is dropped and pillar confidence is reduced.

---

## Pillar 4 — Liquidity & Runway (20 points)

| Sub-metric | Points | Definition |
| --- | --- | --- |
| Operating runway | 9 | Months of operating expense covered by the liquid buffer |
| Days cash on hand | 5 | Buffer ÷ average daily outflow |
| Buffer stability | 4 | Volatility of the month-end balance |
| Overdraft incidence | 2 | Days with a negative balance |

```
burn_rate     = μ(monthly_outflow) − μ(monthly_inflow)       # if positive
runway_months = average_liquid_buffer / max(burn_rate, minimum_operating_outflow)
```

| Metric | Full points | Zero points |
| --- | --- | --- |
| Runway | ≥ 6 months | ≤ 0.5 months |
| Days cash on hand | ≥ 90 | ≤ 10 |
| Buffer stability (CV) | ≤ 0.25 | ≥ 1.00 |
| Overdraft days | 0 | ≥ 15 |

> **Degradation:** this pillar depends most heavily on a balance column. Without one, only a rough buffer proxy from cumulative net flow is available; the pillar is scored at reduced confidence (≤ 0.55) and the report states the limitation explicitly rather than presenting a runway figure the data cannot support.

---

## Pillar 5 — Risk Profile (10 points)

Starts at **10** and deducts for observed risk events.

| Signal | Deduction | Detection |
| --- | --- | --- |
| Returned / bounced payment | −2 each (max −4) | Description patterns: NSF, returned, unpaid, reversal |
| Overdraft event | −1 each (max −3) | Negative balance day |
| Loan/credit stress indicator | −2 | Missed repayment in a detected loan series |
| Large unexplained outflow | −1 each (max −2) | Outflow > 3σ above the mean with no category match |
| Structural break in revenue | −2 | Detected level shift in the monthly revenue series |
| Rapid deterioration | −2 | Last-quarter net flow materially below the trailing average |

Floor is 0. Every deduction produces a `RiskFlag` with severity and the transaction IDs that triggered it — the score change is always explainable down to the row.

---

## Funding Readiness

Derived from the score, specific pillars, and hard gates — because lenders apply gates, not averages.

| Tier | Requirements |
| --- | --- |
| **Ready** | Score ≥ 75 · Revenue Quality ≥ 18/25 · runway ≥ 3 months · no critical risk flags · ≥ 12 months data |
| **Near Ready** | Score ≥ 62 · at most one material blocker · ≥ 6 months data |
| **Building** | Score ≥ 45 · identifiable, addressable blockers |
| **Not Ready** | Below the above, or critical risk flags present |

**Standard blockers**, each emitted with the remedy that would clear it:

| Blocker | Trigger |
| --- | --- |
| Insufficient history | < 6 months of data |
| Revenue concentration | HHI ≥ 0.35 or largest counterparty > 40% of inflow |
| Negative trend | Revenue trend ≤ −2% / month over the period |
| Thin runway | Runway < 2 months |
| Overdraft dependence | Overdraft days ≥ 10 |
| Payment failures | ≥ 2 returned payments in the period |
| Expense overrun | Expense growth exceeds revenue growth by ≥ 5 pp |

VitalFlow states plainly that this is an **indicative readiness assessment, not a credit decision or a promise of approval**. Lending decisions belong to licensed institutions.

---

## Confidence

Every pillar carries a confidence value in `[0, 1]`; the analysis confidence is the weighted mean.

Confidence is reduced by:

| Factor | Effect |
| --- | --- |
| Period < 6 months | ×0.75 (and ×0.55 under 3 months) |
| No balance column | Liquidity ×0.55, Cash Flow ×0.75 |
| Categorisation coverage < 60% | Expense Discipline ×0.70 |
| Rejected rows 2–5% | ×0.90 |
| Detected data gaps | ×0.85 |
| Low column-mapping confidence | ×0.80 across all pillars |

Where analysis confidence falls below **0.6**, the UI and report lead with the data-quality limitation rather than the score. Presenting a confident-looking number derived from poor data is the worst failure mode available to this product.

---

## Worked example

A 12-month statement, currency XCD:

```
Cash Flow Stability      17 / 25
  positivity 9/12 = 0.75                     →  5.0 / 8
  CV net flow = 0.62                         →  4.5 / 7
  max consecutive negative = 1               →  3.8 / 5
  max drawdown = 34%                         →  3.7 / 5

Revenue Quality          14 / 25
  trend = +1.4% / month                      →  5.6 / 7
  CV revenue = 0.58                          →  3.2 / 7
  recurring share = 0.22                     →  3.1 / 6
  HHI = 0.41 (two clients = 61%)             →  2.1 / 5

Expense Discipline       16 / 20
  leverage gap = +1.1 pp                     →  5.9 / 8
  fixed cover = 2.1×                         →  4.1 / 5
  CV outflow = 0.44                          →  3.1 / 4
  discretionary = 12%                        →  2.9 / 3

Liquidity & Runway        9 / 20
  runway = 1.4 months                        →  2.9 / 9
  days cash on hand = 42                     →  2.8 / 5
  buffer CV = 0.51                           →  2.3 / 4
  overdraft days = 3                         →  1.0 / 2

Risk Profile              7 / 10
  10 − 2 (one returned payment)
     − 1 (three overdraft days)              →  7.0 / 10

TOTAL                    63 / 100   →   WATCH
Confidence 0.86
```

The dominant constraint is Liquidity & Runway, and the dominant *cause* is revenue concentration: when the largest client pays late, the buffer is not deep enough to absorb it. That causal chain — concentration → volatility → overdraft → thin runway → unfundable — is exactly what the Insight Generation Agent is asked to articulate.

---

## Calibration and honesty

The current thresholds are **expert-designed, not empirically fitted**. They are grounded in standard small-business finance practice (coverage ratios, days cash on hand, concentration measures used in credit assessment), but they have not yet been validated against real lending outcomes.

We say this in the product, not just in the repository.

Planned validation path:

1. **Phase 1–2:** apply to real anonymised statements; check face validity with accountants and MSME advisors.
2. **Phase 3:** partner with lenders to compare scores against actual repayment outcomes.
3. **Phase 4:** recalibrate weights and curves against observed default and repayment data; publish the change and its effect.

All thresholds are centralised in `SCORING_CONFIG` and versioned. Every analysis records the scoring version that produced it, so historical scores remain interpretable after recalibration.
