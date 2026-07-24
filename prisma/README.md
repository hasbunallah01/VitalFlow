# `prisma/`

`schema.prisma` is a **draft** implementation of [docs/DATA_MODEL.md](../docs/DATA_MODEL.md). It has
not been migrated and will change before the first migration lands.

Invariants the schema encodes:

- Money is `BigInt` minor units with an explicit `currency`. Never `Float`.
- Every financial row carries `organizationId`.
- `AgentRun` and `AuditLog` are append-only.
- Deleting a `Statement` cascades to analyses, reports, and derived rows — the user's erasure path.
- Every `Analysis` records the `scoringVersion` that produced it.
