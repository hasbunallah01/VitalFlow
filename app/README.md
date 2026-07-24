# `app/` — Next.js App Router

| Route group | Purpose |
| --- | --- |
| `(marketing)/` | Public pages: landing, how it works, methodology |
| `(dashboard)/dashboard/` | Analysis list and overview |
| `(dashboard)/analysis/[id]/` | Single analysis: score, cash flow, insights, report |
| `api/v1/` | Versioned route handlers — see [API_PLAN](../docs/API_PLAN.md) |

**Rules**

- Route handlers do auth, validation, and response shaping. They contain no analysis logic.
- Server components fetch through `lib/db/` helpers, which enforce `organizationId` scoping.
- Nothing here calls an LLM directly. All model access goes through an agent.
