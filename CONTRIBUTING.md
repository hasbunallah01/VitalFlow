# Contributing to VitalFlow

Thanks for being here. VitalFlow is financial software for people who cannot afford to be given a wrong number, so the bar for correctness is high — but the bar for asking questions is zero.

## Before you start

Read, in order: [README](README.md) → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → [docs/AGENTS.md](docs/AGENTS.md).

If you are touching the score, also read [docs/SCORING_METHODOLOGY.md](docs/SCORING_METHODOLOGY.md).

## Especially wanted

| Contribution | Why it matters |
| --- | --- |
| **Bank statement format profiles** | Every bank exports differently. A profile for your bank makes VitalFlow work for everyone who banks there. Anonymise before sharing — see below. |
| **Financial methodology review** | If you are an accountant, lender, or MSME advisor and a threshold looks wrong, open an issue. Domain critique is more valuable to us than code. |
| **Localisation** | Spanish, French, and Dutch for the wider Caribbean. |
| **Adversarial test fixtures** | Malformed CSVs, hostile column names, injection attempts in descriptions, extreme values. |
| **Accessibility fixes** | WCAG 2.1 AA is a requirement, not an aspiration. |

> ⚠️ **Never commit real financial data.** Anonymise fixtures completely: fake counterparties, shifted dates, scaled amounts. Sample data must be synthetic. PRs containing real statements will be closed and the data purged.

## Setup

```bash
git clone https://github.com/hasbunallah01/VitalFlow.git
cd VitalFlow
npm install
cp .env.example .env.local
docker compose up -d db
npx prisma migrate dev
npm run dev
```

## Workflow

1. Open an issue first for anything non-trivial. Agreement on approach beats a rejected PR.
2. Branch from `main`: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat(agents): add recurring series detection`.
4. Keep PRs focused. One concern per PR.
5. Fill in the PR template — especially the testing section.

## Standards

**TypeScript**

- `strict` on. No `any` in `lib/analysis/` — no exceptions.
- Money is always `Money`, never `number`. See [ADR-0004](docs/adr/0004-money-as-integer-minor-units.md).
- Zod schemas at every API and agent boundary.

**The deterministic boundary**

`lib/analysis/` is pure: no I/O, no LLM calls, no framework imports, no `Date.now()` inside a calculation. A PR that puts a model call in the analysis core will be rejected on principle, not on style. See [ADR-0002](docs/adr/0002-deterministic-core-narrative-llm.md).

**Agents**

- One responsibility. If you need two sentences to describe it, it is two agents.
- Only read the previous agent's output. No sideways reads, no direct database access from inside an agent.
- Every run writes an `AgentRun` record.
- New or changed agent contracts require a matching update to `docs/AGENTS.md` in the same PR.

**Prompts**

- Live in `prompts/`, one versioned file per LLM-using agent.
- **Bump the version** for any change that could alter output.
- Include before/after output on the standard fixture set in the PR description. "It reads better" is not evidence.
- Prompt changes must preserve the guardrails: structured output, no arithmetic, no advice outside scope, untrusted-input handling.

**Testing**

| Change | Required |
| --- | --- |
| `lib/analysis/` | Unit tests, 90%+ coverage on new code |
| Agents | Contract tests against fixtures |
| Score or thresholds | Updated golden files, with the diff explained in the PR |
| API routes | Request/response tests including error paths |
| UI | Accessibility check; keyboard navigable |

```bash
npm run test
npm run typecheck
npm run lint
```

## Changing the score

The Financial Health Score is the product. Changes to weights, thresholds, or curves require:

1. An issue explaining the financial reasoning, ideally with a source
2. The effect on every golden-file fixture, shown in the PR
3. A version bump of `SCORING_CONFIG`
4. An update to `docs/SCORING_METHODOLOGY.md` in the same PR

Historical analyses record their scoring version and must remain interpretable after any change.

## Reviews

You can expect a first response within a few days. Reviews focus on correctness first, boundaries second, style last — style is the linter's job. Disagreement is welcome; assume good faith and argue the substance.

## Reporting security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
