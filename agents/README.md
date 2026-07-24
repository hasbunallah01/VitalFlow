# `agents/` — the analysis pipeline

Five narrow agents plus an orchestrator. Full contracts: [docs/AGENTS.md](../docs/AGENTS.md).

```
orchestrator → data-validation → transaction-analysis → financial-health
                                                      → insight-generation
                                                      → report-generation
```

| Directory | Responsibility | Uses LLM |
| --- | --- | --- |
| `orchestrator/` | Sequencing, checkpointing, retries, budgets, progress events | — |
| `data-validation/` | Untrusted CSV → typed, trustworthy transactions | Ambiguity only |
| `transaction-analysis/` | Categories, recurring series, counterparties, monthly aggregates | Fallback categorisation |
| `financial-health/` | Metrics, pillar scores, composite score, risk flags | No — never |
| `insight-generation/` | Narrative, insights, ranked recommendations | Yes |
| `report-generation/` | Structured report model → PDF | No |
| `shared/` | Base contract, tracing, cost accounting, guardrail helpers | — |

**Rules**

1. One responsibility per agent.
2. Read only the previous agent's output. No sideways reads, no direct database access.
3. Typed in, typed out, Zod-validated at the boundary.
4. Every run writes an `AgentRun` record.
5. Changing a contract means updating `docs/AGENTS.md` in the same PR.
