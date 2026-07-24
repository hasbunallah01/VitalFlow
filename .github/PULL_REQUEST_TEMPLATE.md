## What does this change?

<!-- One or two sentences. Link the issue it closes. -->

Closes #

## Type

- [ ] Feature
- [ ] Fix
- [ ] Documentation
- [ ] Refactor
- [ ] Test
- [ ] Chore

## Testing

<!-- What did you test, and how? "It works locally" is not testing. -->

- [ ] Unit tests added or updated
- [ ] Contract/golden-file tests updated where agent or score output changed
- [ ] `npm run test`, `npm run typecheck`, and `npm run lint` pass

## Checklists

**If this touches `lib/analysis/`**
- [ ] Functions remain pure — no I/O, no LLM, no framework imports
- [ ] Money handled as integer minor units with explicit currency
- [ ] Unit tests cover the new behaviour

**If this touches `agents/` or `prompts/`**
- [ ] `docs/AGENTS.md` updated in this PR
- [ ] Prompt version bumped if output could change
- [ ] Before/after output on the standard fixtures included below

**If this touches the score**
- [ ] Financial reasoning explained in the linked issue
- [ ] `SCORING_CONFIG` version bumped
- [ ] `docs/SCORING_METHODOLOGY.md` updated
- [ ] Effect on golden-file fixtures shown below

**Always**
- [ ] No real financial data in fixtures, tests, or screenshots
- [ ] No secrets, keys, or tokens committed

## Notes for the reviewer

<!-- Anything you want them to look at closely, or a decision you're unsure about. -->
