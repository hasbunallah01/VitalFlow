# Design System

> Modern fintech: clean, minimal, trustworthy. AI-first but practical. Built for a business owner on a phone, not an analyst on a trading desk.

## Design principles

1. **Clarity over density.** One primary answer per screen. The score is the hero; detail is progressive disclosure.
2. **Plain language.** "Money coming in", not "gross inflow aggregate". Financial jargon is defined inline where unavoidable.
3. **Honest visualisation.** Axes start at zero. Uncertainty is shown, not hidden. No chart flatters the data.
4. **Calm, not alarming.** A struggling business is told plainly and constructively. Red is used for genuine risk, never for decoration.
5. **Mobile first.** Many MSME owners have a phone and no laptop. Every view works at 375px.
6. **Accessible by default.** WCAG 2.1 AA minimum. Never colour alone to convey meaning — always colour + label + shape.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `--brand-primary` | `#0F766E` | Primary actions, brand |
| `--brand-accent` | `#0EA5E9` | Highlights, data emphasis |
| `--ink` | `#0F172A` | Primary text |
| `--ink-muted` | `#64748B` | Secondary text |
| `--surface` | `#FFFFFF` | Cards |
| `--surface-subtle` | `#F8FAFC` | Page background |
| `--border` | `#E2E8F0` | Dividers |
| `--positive` | `#059669` | Inflow, improvement |
| `--negative` | `#DC2626` | Outflow, deterioration |
| `--warning` | `#D97706` | Watch-level signals |
| `--critical` | `#B91C1C` | Critical risk only |

### Health band colours

| Band | Token | Hex |
| --- | --- | --- |
| Strong | `--band-strong` | `#059669` |
| Healthy | `--band-healthy` | `#10B981` |
| Watch | `--band-watch` | `#D97706` |
| Fragile | `--band-fragile` | `#EA580C` |
| Critical | `--band-critical` | `#B91C1C` |

Band colour is always paired with the band label. A colour-blind user must lose nothing.

## Typography

- **UI:** Inter — `-0.01em` tracking on headings
- **Numerals:** Inter with `font-variant-numeric: tabular-nums` for all figures in tables and charts. Money must align vertically.
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 48
- **Weights:** 400 body, 500 emphasis, 600 headings, 700 score display

## Number formatting

- Money is locale- and currency-aware: `XCD 48,210.00`, `$48,210.00`, `₦48,210.00`
- Large figures abbreviate in charts only, never in tables: `48.2K`
- Percentages to one decimal; percentage-point changes labelled `pp`, not `%`
- Negative amounts use a minus sign and `--negative`, never parentheses alone
- Every figure carries its currency somewhere in the visible context

## Components

| Component | Notes |
| --- | --- |
| `ScoreDial` | 0–100 composite with band label and confidence indicator |
| `PillarBar` | Score / max with contributing metrics on expand |
| `MetricCard` | Value, unit, trend, confidence, and "what this means" |
| `CashFlowChart` | Monthly inflow/outflow bars with net line |
| `TrendChart` | Line with trend overlay; no smoothing that hides volatility |
| `InsightCard` | Severity badge, explanation, source metrics link |
| `RecommendationCard` | Action, effort, expected point gain, timeframe |
| `RiskFlagList` | Severity-ordered, evidence-linked |
| `FundingReadinessPanel` | Tier, blockers, each with its remedy |
| `ConfidenceBadge` | Present wherever a figure has reduced confidence |
| `UploadDropzone` | Drag-and-drop with inline validation feedback |
| `ColumnMapper` | The human-in-the-loop step for ambiguous statements |

Primitives come from shadcn/ui and are owned in-repo under `components/ui/`.

## Voice

**We sound like:** a straight-talking advisor who respects your intelligence and your time.

| Do | Don't |
| --- | --- |
| "Two clients are 61% of your income. If one leaves, you have 1.4 months of runway." | "Your revenue concentration metric indicates suboptimal diversification." |
| "This is the single biggest thing holding back your funding chances." | "You might possibly want to consider looking at diversification." |
| "We can't measure your runway accurately — your statement has no balance column." | *(silently showing a runway number anyway)* |

Never congratulatory. Never catastrophising. Never certain about something the data can't support.
