# Changelog

All notable changes to VitalFlow are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial repository documentation and scaffolding
- README with vision, problem statement, solution, and agent architecture
- `docs/ARCHITECTURE.md` — system design, pipeline state machine, layer boundaries
- `docs/AGENTS.md` — contracts, guardrails, and failure modes for all five agents
- `docs/API_PLAN.md` — REST surface, errors, events, and the Phase 3 partner API
- `docs/DATA_MODEL.md` — entities, relationships, and cross-cutting invariants
- `docs/SCORING_METHODOLOGY.md` — the Financial Health Score, published in full
- `docs/SECURITY_PRIVACY.md`, `docs/DESIGN_SYSTEM.md`, `docs/GLOSSARY.md`
- `docs/ROADMAP.md` and `docs/BUILDATHON.md`
- ADRs 0001–0005
- Draft Prisma schema, agent prompt drafts, and core type contracts
- CI workflow, issue and PR templates, Dependabot, CODEOWNERS
- Synthetic 12-month statement fixture

### Notes
- No application logic implemented. See [ROADMAP](docs/ROADMAP.md) Phase 1.

---

## Versioning plan

| Version | Meaning |
| --- | --- |
| `0.0.x` | Documentation and scaffolding |
| `0.1.0` | First working pipeline: CSV → validated → scored |
| `0.5.0` | MVP complete: upload → analysis → insights → PDF |
| `1.0.0` | Production-ready, methodology reviewed, deployed |

Scoring changes carry their own version (`SCORING_CONFIG`), recorded on every analysis so
historical scores stay interpretable after recalibration.
