# `prompts/`

Versioned system prompts. One file per LLM-using agent.

| File | Agent | Version |
| --- | --- | --- |
| `insight-generation.system.md` | Insight Generation | `v1` |
| `transaction-categorization.system.md` | Transaction Analysis (fallback pass) | `v1` |
| `column-inference.system.md` | Data Validation (ambiguity escalation) | `v1` |

## Rules

1. **Bump the version** for any change that could alter output. The version is recorded on every `AgentRun`, so historical outputs stay reproducible.
2. **Structured output only.** Every prompt specifies a JSON schema and forbids prose outside it.
3. **No arithmetic.** The model never computes a figure. Any number in its output must match a value supplied in the context.
4. **Untrusted input is delimited and labelled.** Transaction descriptions are attacker-controllable — anyone who pays you can set the reference text.
5. **Scope limits are explicit.** No investment, tax, or legal advice. No promises about lending outcomes.
6. PRs changing a prompt must include before/after output on the standard fixture set.
