# `lib/` — framework-agnostic core

| Directory | Contains |
| --- | --- |
| `analysis/` | **The deterministic financial core.** Pure functions only |
| `csv/` | Parsing, encoding/delimiter detection, column-role inference, normalisation |
| `llm/` | Provider-agnostic OpenAI-compatible client: structured output, retries, redaction, token accounting |
| `pdf/` | Report rendering |
| `db/` | Prisma client and organisation-scoped query helpers |

## The rule for `lib/analysis/`

Pure. No I/O, no LLM, no framework imports, no ambient time. Same input, same output, forever.

Planned modules: `money.ts` · `cashflow.ts` · `revenue.ts` · `expenses.ts` · `recurring.ts` · `liquidity.ts` · `anomalies.ts` · `score.ts`

Money is always integer minor units plus an explicit currency — see [ADR-0004](../docs/adr/0004-money-as-integer-minor-units.md).

Coverage target: 90%+.
