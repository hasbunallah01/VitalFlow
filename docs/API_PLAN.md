# API Plan

> Design specification for the VitalFlow HTTP API. Not yet implemented. Contracts here are the target for Phase 1 and the stable base for the Phase 3 partner API.

---

## Conventions

| | |
| --- | --- |
| **Base path** | `/api/v1` |
| **Format** | JSON (`application/json`), UTF-8 |
| **Errors** | [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json` |
| **IDs** | Prefixed ULIDs — `stm_`, `anl_`, `rpt_`, `org_`, `run_` |
| **Money** | `{ "amount": 125000, "currency": "XCD" }` — integer **minor units**, never a float |
| **Dates** | ISO 8601. Dates `YYYY-MM-DD`; timestamps UTC with `Z` |
| **Versioning** | Path-versioned. Breaking changes require `/api/v2`; additive fields do not |
| **Idempotency** | `Idempotency-Key` header honoured on all `POST` requests |
| **Pagination** | Cursor-based: `?limit=&cursor=` → `{ data, nextCursor }` |

### Why minor units

`0.1 + 0.2 !== 0.3`. Financial software that stores money as a float will eventually produce a number it cannot defend. Every amount crossing this API is an integer plus a currency code.

---

## Authentication

| Phase | Mechanism |
| --- | --- |
| **MVP (Phase 1)** | Anonymous session cookie. An analysis is readable only within the session that created it. |
| **Phase 2** | Authenticated accounts, organisation-scoped access, session cookies for the app. |
| **Phase 3** | `Authorization: Bearer <api_key>` for partner/lender integrations, scoped per organisation with explicit business consent. |

Every business-scoped resource is filtered by `organizationId` at the repository layer. There is no unscoped read path.

---

## Endpoints

### Statements

#### `POST /api/v1/statements`

Upload a bank statement file.

**Request:** `multipart/form-data`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | File | ✅ | CSV. Max 10 MB, max 50,000 rows |
| `currency` | string | | ISO 4217. Inferred if omitted |
| `businessName` | string | | Used on the report cover |

**`201 Created`**

```json
{
  "id": "stm_01J8XK2P9Q",
  "filename": "statement-2025.csv",
  "sizeBytes": 184320,
  "rowsDetected": 1184,
  "status": "uploaded",
  "createdAt": "2026-07-24T10:14:22Z"
}
```

**Errors:** `413` file too large · `415` unsupported media type · `422` unreadable file

---

#### `GET /api/v1/statements/{id}`

Returns the statement record, including the `DataQualityReport` once validation has run.

---

#### `DELETE /api/v1/statements/{id}`

Deletes the raw file and all derived analyses. Hard delete — this is the user's data-erasure path.

---

### Analyses

#### `POST /api/v1/analyses`

Start an analysis. Returns immediately; the pipeline runs asynchronously.

```json
{
  "statementId": "stm_01J8XK2P9Q",
  "options": {
    "includeNarrative": true,
    "generateReport": true,
    "locale": "en-BB"
  }
}
```

**`202 Accepted`**

```json
{
  "id": "anl_01J8XK4T7B",
  "statementId": "stm_01J8XK2P9Q",
  "status": "queued",
  "progress": { "stage": "queued", "percent": 0 },
  "createdAt": "2026-07-24T10:14:40Z"
}
```

---

#### `GET /api/v1/analyses/{id}`

Poll for status and, once complete, the full result.

**In progress (`200`)**

```json
{
  "id": "anl_01J8XK4T7B",
  "status": "analyzing",
  "progress": { "stage": "transaction-analysis", "percent": 45 },
  "stages": [
    { "agent": "data-validation",     "status": "completed", "durationMs": 1420 },
    { "agent": "transaction-analysis", "status": "running" },
    { "agent": "financial-health",     "status": "pending" },
    { "agent": "insight-generation",   "status": "pending" },
    { "agent": "report-generation",    "status": "pending" }
  ]
}
```

**Completed (`200`, abridged)**

```json
{
  "id": "anl_01J8XK4T7B",
  "status": "completed",
  "confidence": 0.86,
  "period": { "start": "2025-07-01", "end": "2026-06-30", "months": 12 },
  "currency": "XCD",
  "health": {
    "score": 63,
    "band": "Watch",
    "pillars": [
      { "id": "cash_flow_stability", "label": "Cash Flow Stability", "score": 17, "max": 25, "confidence": 0.9 },
      { "id": "revenue_quality",     "label": "Revenue Quality",     "score": 14, "max": 25, "confidence": 0.88 },
      { "id": "expense_discipline",  "label": "Expense Discipline",  "score": 16, "max": 20, "confidence": 0.82 },
      { "id": "liquidity_runway",    "label": "Liquidity & Runway",  "score": 9,  "max": 20, "confidence": 0.71 },
      { "id": "risk_profile",        "label": "Risk Profile",        "score": 7,  "max": 10, "confidence": 0.95 }
    ]
  },
  "cashFlow": {
    "totalInflow":  { "amount": 48210000, "currency": "XCD" },
    "totalOutflow": { "amount": 45980000, "currency": "XCD" },
    "netFlow":      { "amount": 2230000,  "currency": "XCD" },
    "negativeMonths": 3,
    "volatility": 0.41,
    "runwayMonths": 1.4
  },
  "fundingReadiness": {
    "tier": "Building",
    "blockers": [
      {
        "id": "concentration",
        "label": "Revenue concentration above 50%",
        "detail": "Two counterparties account for 61% of inflows.",
        "remedy": "Reduce largest-client share below 40%."
      }
    ]
  },
  "reportId": "rpt_01J8XK9M2C"
}
```

**Failed (`200`)** — failure is a legitimate terminal state, not an HTTP error:

```json
{
  "id": "anl_01J8XK4T7B",
  "status": "validation_failed",
  "failure": {
    "stage": "data-validation",
    "code": "INSUFFICIENT_PERIOD",
    "message": "Statement covers 18 days. A minimum of 30 days is required.",
    "recoverable": false
  }
}
```

---

#### `GET /api/v1/analyses/{id}/events`

**Server-Sent Events** stream of live pipeline progress.

```
event: stage.started
data: {"agent":"transaction-analysis","percent":30}

event: stage.completed
data: {"agent":"transaction-analysis","percent":55,"durationMs":2810}

event: analysis.completed
data: {"analysisId":"anl_01J8XK4T7B","score":63,"reportId":"rpt_01J8XK9M2C"}
```

Event types: `stage.started` · `stage.completed` · `stage.failed` · `analysis.awaiting_input` · `analysis.degraded` · `analysis.completed` · `analysis.failed`

---

#### `POST /api/v1/analyses/{id}/resolve`

Resolve an `AWAITING_INPUT` state — user confirms column mapping, date format, or currency. The pipeline resumes from the validation checkpoint.

```json
{
  "columnMapping": { "date": "Txn Date", "description": "Narrative", "debit": "Withdrawal", "credit": "Deposit", "balance": "Running Bal" },
  "dateFormat": "DD/MM/YYYY",
  "currency": "XCD"
}
```

---

#### Sub-resources

| Endpoint | Returns |
| --- | --- |
| `GET /analyses/{id}/transactions` | Paginated normalised transactions with category and recurring-series membership. Filters: `?category=&direction=&from=&to=` |
| `GET /analyses/{id}/insights` | `InsightSet` — narrative, insights, ranked recommendations |
| `GET /analyses/{id}/metrics` | The full `MetricSet`, each entry with value, unit, and confidence |
| `GET /analyses/{id}/agent-runs` | The audit ledger: agent, version, prompt ID, model, tokens, cost, duration |
| `DELETE /analyses/{id}` | Deletes the analysis and its report |

`agent-runs` is what makes the system auditable to a third party. It is a first-class endpoint, not a debug view.

---

### Reports

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/reports/{id}` | Report metadata |
| `GET /api/v1/reports/{id}/download` | `302` to a signed, expiring PDF URL |
| `POST /api/v1/reports/{id}/share` | Creates a time-limited, revocable public share link |
| `DELETE /api/v1/reports/{id}/share/{token}` | Revokes a share link |

Share links are how a business hands a report to a bank without granting account access. They expire (default 14 days), are revocable, and every access is logged.

---

### Utility

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/health` | Liveness — app, database, LLM provider reachability |
| `GET /api/v1/meta/currencies` | Supported currencies with formatting rules |
| `GET /api/v1/meta/bank-profiles` | Known bank statement format profiles |
| `GET /api/v1/meta/scoring` | Live pillar weights and band thresholds — the methodology is public |

---

## Phase 3 — Partner / Lender API

The credit layer. Design constraints stated now so Phase 1 does not foreclose them.

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/underwriting/profiles` | Generate a standardised, lender-facing credit profile from one or more analyses |
| `GET /api/v1/underwriting/profiles/{id}` | Retrieve a profile — normalised cash-flow metrics, stability indicators, verification status |
| `POST /api/v1/consents` | Business grants a named lender scoped, time-bound access |
| `DELETE /api/v1/consents/{id}` | Business revokes access — immediate and unilateral |
| `POST /api/v1/webhooks` | Register endpoints for `analysis.completed`, `profile.updated`, `consent.revoked` |

**Non-negotiables:**

1. **The business owns the data.** A lender never reads a profile without an active, explicit, revocable consent record.
2. **Consent is granular and expiring.** Scoped to a lender, a purpose, and a time window.
3. **Every partner access is logged** and visible to the business owner.
4. **VitalFlow does not make lending decisions.** It supplies a structured, auditable profile. The credit decision belongs to the licensed institution.

---

## Errors

RFC 9457 problem details:

```json
{
  "type": "https://vitalflow.dev/errors/insufficient-period",
  "title": "Insufficient statement period",
  "status": 422,
  "detail": "Statement covers 18 days. A minimum of 30 days is required for a health assessment.",
  "instance": "/api/v1/analyses/anl_01J8XK4T7B",
  "code": "INSUFFICIENT_PERIOD"
}
```

| Code | Status | Meaning |
| --- | --- | --- |
| `INVALID_FILE_TYPE` | 415 | Not a parseable CSV |
| `FILE_TOO_LARGE` | 413 | Exceeds the size cap |
| `ROW_LIMIT_EXCEEDED` | 422 | Exceeds the row cap |
| `AMBIGUOUS_COLUMNS` | 409 | Requires user confirmation via `/resolve` |
| `AMBIGUOUS_DATE_FORMAT` | 409 | Requires user confirmation via `/resolve` |
| `INSUFFICIENT_PERIOD` | 422 | Under 30 days of data |
| `EXCESSIVE_REJECTED_ROWS` | 422 | Over 5% of rows unparseable |
| `ANALYSIS_IN_PROGRESS` | 409 | An analysis is already running for this statement |
| `LLM_UNAVAILABLE` | 200 | Not fatal — analysis proceeds in `degraded` mode |
| `RATE_LIMITED` | 429 | With `Retry-After` |
| `CONSENT_REQUIRED` | 403 | Partner access without an active consent record |

---

## Rate limits

| Scope | Limit |
| --- | --- |
| Uploads | 10 / hour / session |
| Analyses | 20 / hour / organisation |
| Reads | 300 / minute / organisation |
| Partner API | Negotiated per key |

Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

---

## Open questions

- Should `GET /analyses/{id}` embed insights by default, or always require the sub-resource? Leaning **embed a summary, sub-resource for full detail**.
- Webhook signing scheme for Phase 3 — HMAC-SHA256 with a rotating secret is the current assumption.
- Whether the partner API should expose the score at all, or only the underlying normalised metrics and let each institution apply its own model. Leaning **metrics-first**, since lenders will not outsource their credit policy.
