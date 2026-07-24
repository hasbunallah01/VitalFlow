# `scripts/`

Developer and operational scripts.

| Planned script | Purpose |
| --- | --- |
| `generate-fixture.ts` | Generate synthetic statements with controllable characteristics (volatility, concentration, seasonality) for testing |
| `run-pipeline.ts` | Run the full pipeline against a fixture from the CLI, without the UI |
| `score-report.ts` | Print the full pillar and sub-metric breakdown for a fixture — the calibration workhorse |
| `purge-expired.ts` | Delete raw files past their retention window |

Synthetic fixtures only. Never script against real financial data.
