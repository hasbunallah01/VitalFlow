# Security & Privacy

> Bank statements are among the most sensitive documents a business holds. This document states how VitalFlow handles them.

## Principles

1. **Minimum data.** We ask for transaction data and nothing else. No ID documents, no account credentials, no bank logins in the MVP.
2. **The business owns its data.** Export and delete are first-class features, not support tickets.
3. **Nothing identifying leaves the building.** PII is redacted before any third-party model call.
4. **No sale of financial data.** Ever. Access to a business's data is consent-based, scoped, time-bound, and revocable.
5. **Every access is logged**, including our own and our partners'.

## Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| **Critical** | Raw statement files, account numbers, balances | Encrypted at rest, short retention, never sent to third parties |
| **Sensitive** | Transactions, counterparty names, amounts | Encrypted at rest, redacted before LLM egress |
| **Derived** | Metrics, scores, insights | Retained with the analysis, business-scoped |
| **Operational** | Agent runs, timings, token counts | Retained for audit and cost control |

## PII redaction before LLM egress

The Insight Generation Agent receives **aggregates, not transactions**. Where counterparty labels are needed for concentration narrative, they are pseudonymised:

```
"ACME LIMITED"  →  "Customer A"      (mapping held server-side, in-memory)
"4471-XXXX-2210" → removed entirely
```

Redacted before egress: account and card numbers, national ID numbers, phone numbers, email addresses, physical addresses, personal names in descriptions, and the business's own account identifiers. Pseudonyms are re-hydrated after the model responds, for display only.

**Never sent to a model provider:** the raw CSV, full transaction lists, balances tied to identifiers, or the file itself.

## Retention

| Data | Default retention |
| --- | --- |
| Raw uploaded file | 30 days, then hard-deleted |
| Normalised transactions | Life of the statement record |
| Analyses, metrics, insights | Life of the account |
| Generated PDF reports | Life of the account |
| Share links | 14 days, revocable at any time |
| Audit logs | 24 months |

`DELETE /api/v1/statements/{id}` is a genuine cascading hard delete.

## Application security

- All traffic over TLS; HSTS enabled
- Uploaded files stored outside the web root, accessible only via short-lived signed URLs
- Strict `organizationId` scoping at the repository layer — no unscoped read path exists
- Zod validation at every API and agent boundary
- CSRF protection on mutating routes; rate limits per session and organisation
- Content Security Policy; no inline script
- Secrets via environment only — never committed, never client-exposed
- Dependency scanning via Dependabot; CI fails on high-severity advisories

## Adversarial considerations

**Prompt injection via transaction descriptions.** Payment references are attacker-controllable — anyone who pays you can set the narrative text. All description text passed to a model is delimited, explicitly marked as untrusted data, and the system prompt forbids treating it as instruction. Model output is schema-validated and numeric-fidelity-checked before persistence.

**Malicious CSVs.** Size and row caps, streaming parse with bounded memory, formula-injection neutralisation (`=`, `+`, `-`, `@` prefixes) on any exported cell, no shell or filesystem interpolation of user content.

**Enumeration.** ULIDs, not sequential IDs. Share tokens are high-entropy and single-purpose.

## Compliance posture

VitalFlow is an analytical tool, not a regulated financial institution. It does not hold funds, move money, or make credit decisions.

Design targets ahead of Phase 3 partner integrations:

- GDPR-aligned rights: access, portability, erasure, rectification
- Caribbean and regional data-protection statutes per target jurisdiction
- Data residency options where required by a partner institution
- SOC 2-aligned controls as a Phase 3 objective

## Reporting a vulnerability

See [SECURITY.md](../SECURITY.md).
