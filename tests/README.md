# `tests/`

| Level | Scope |
| --- | --- |
| **Unit** | `lib/analysis/` — every function, 90%+ coverage |
| **Contract** | Each agent against fixture inputs; asserts output schema and invariants |
| **Golden file** | Full pipeline over fixture statements, diffed against committed snapshots |
| **Adversarial** | Malformed CSVs, hostile headers, prompt injection in descriptions, extreme values, single-transaction statements |
| **E2E** | Upload → analysis → report download |

`fixtures/` holds **synthetic data only**. Never commit real financial data — see [CONTRIBUTING.md](../CONTRIBUTING.md).
