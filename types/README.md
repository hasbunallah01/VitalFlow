# `types/`

Shared TypeScript contracts. These are the boundaries between layers, so they are defined once, here, and imported everywhere.

| File | Contains |
| --- | --- |
| `money.ts` | `Money`, `CurrencyCode` |
| `transaction.ts` | `Transaction`, `Direction`, `Category`, `Counterparty` |
| `statement.ts` | `ValidatedStatement`, `ColumnMapping`, `DataQualityReport` |
| `analysis.ts` | `TransactionAnalysis`, `MetricSet`, `MonthlyAggregate`, `RecurringSeries` |
| `health.ts` | `HealthAssessment`, `PillarScore`, `RiskFlag`, `FundingReadiness` |
| `insight.ts` | `InsightSet`, `Insight`, `Recommendation` |
| `agent.ts` | `Agent`, `AgentContext`, `AgentResult` |
| `api.ts` | Request/response shapes and problem-details errors |

Each type has a matching Zod schema used at runtime boundaries. `any` is not permitted here.
