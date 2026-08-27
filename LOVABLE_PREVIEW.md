# VitalFlow — Previewing in Lovable

This branch (`front-end-design-1`) is a self-contained Next.js application that you can preview in three ways: the live Vercel deployment, your local machine, or by importing the branch into **Lovable**.

---

## 1. Live Vercel preview (fastest)

The branch is auto-deployed by Vercel. The latest URL is at the top of the conversation thread from `Mavis`. It looks like:

```
https://vitalflow-<hash>-hasbunallah.vercel.app
```

Walk the app:

| Step | URL | What you'll see |
|---|---|---|
| 1 | `/` | Public landing page |
| 2 | `/auth/sign-up` → "Create account & continue" | Dev-session sign-up form |
| 3 | `/dashboard` | Empty state with upload zone, or the real Overview if a previous analysis is on the org |
| 4 | upload `tests/fixtures/sample-statement.csv` | Real orchestrator fires — 3 AgentRun rows + 2 Recommendations + 1 FundingOutreach persisted in <10 s |
| 5 | `/dashboard` | Real score 75.4 / Healthy, 5 pillars, trend chart, anomalies, recommendations, recent analyses |
| 6 | `/analysis` | All uploaded analyses |
| 7 | `/insights` | All recommendations + Watcher events |
| 8 | `/funding` → click into a draft | Eligible / Almost / Blocked funding cards |
| 9 | `/reports` | Three report types, all "Coming soon" |
| 10 | `/activity` | Friendly agent timeline |
| 11 | `/audit` | Engineering-grade AgentRun ledger |
| 12 | `/help` | FAQ |
| 13 | `/settings` | Read-only profile / org / preferences / security |

---

## 2. Importing into Lovable

Lovable reads from a GitHub repository and edits the code in-place through its chat interface. To point Lovable at this branch:

1. Open https://lovable.dev and sign in.
2. Click **"Import from GitHub"** in the project picker.
3. Authorize Lovable to access `hasbunallah01/VitalFlow`.
4. Select the repo, **branch = `front-end-design-1`**.
5. Lovable will scaffold the project from the existing files. It may take a minute to index the tree.
6. Once loaded, the preview panel renders the live app from the same source.

### What Lovable will see

```
VitalFlow/
├── app/
│   ├── (marketing)/page.tsx              ← landing page
│   ├── auth/                              ← sign-in / sign-up / forgot-password
│   ├── (dashboard)/                       ← 8 pages: dashboard, analysis, insights,
│   │                                       funding, reports, activity, help, settings
│   └── api/                               ← 10 serverless API routes
├── components/
│   ├── brand/logo.tsx                     ← uses /public/brand/vitalflow-logo.png
│   ├── dashboard/                         ← score-gauge, pillar-card, agent-pulse, rerun button
│   ├── layout/                            ← sidebar, mobile-nav, page-header
│   ├── ui/                                ← card, button, badge, skeleton
│   ├── upload/upload-zone.tsx             ← drag-and-drop with staged progress
│   ├── charts/monthly-trend-chart.tsx
│   ├── funding/outreach-actions.tsx       ← Approve / Share / Revoke UI
│   └── insights/audit/ (empty placeholders)
├── lib/
│   ├── api/                               ← typed fetch wrappers, mirrors all 10 routes
│   ├── utils/                             ← cn, format
│   └── (do not edit: analysis/, csv/, funding/, llm/, orchestrator/, db/)
├── agents/                                ← the 3 live agents (read-only — don't refactor)
├── public/brand/                          ← logo assets
├── tailwind.config.ts                     ← new logo-derived palette
├── app/globals.css
└── package.json
```

### What Lovable should NOT touch

- `lib/analysis/`, `lib/csv/`, `lib/funding/`, `lib/llm/`, `lib/orchestrator/`
- `agents/` (the three real agents)
- `lib/db/persist.ts`, `lib/db/persist-funding.ts`, `prisma/schema.prisma`
- any of the 10 API routes under `app/api/`
- the existing 249 tests under `tests/`

These are the backend hot zones. The 249 passing tests are the contract.

### Environment variables for Lovable preview

Lovable's preview is a sandboxed dev server. The frontend code calls `/api/*` on the same origin, so when Lovable runs the dev server, those routes also run inside the sandbox — but the routes need real env vars to talk to Neon + Nebius.

If you want Lovable's preview to work end-to-end (not just the static UI), add these env vars in Lovable's project settings:

```
DATABASE_URL = postgresql://neondb_owner:npg_oenD91CyGfzt@ep-small-king-ax9crxz7-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NEBIUS_API_KEY = v1.CmMKHHN0YXRpY2tleS1lMDB2MncyZ2p3azVzaGVhNWYSIXNlcnZpY2VhY2NvdW50LWUwMHJqcjMzZXZiZHo3MXZ6ODILCNqR59MGELncvTc6DAjXlP-eBxCAgJL0AUACWgNlMDA.AAAAAAAAAAE1kv8OSo0qZ-ncP6xDwJuwMmyZ0ttKzWdjnb4OFjYryqsVIKBMa1cu0qcmU4UFGKQbpEDLZ_1PMnXGgC5-RQYO
LLM_BASE_URL  = https://api.tokenfactory.nebius.com/v1
LLM_MODEL     = Qwen/Qwen3-30B-A3B-Instruct-2507
```

If you don't set these, the static UI still renders (landing page, auth pages, navigation) but the API routes return 500. The frontend handles that gracefully with friendly error states.

---

## 3. Local development

```bash
git clone -b front-end-design-1 https://github.com/hasbunallah01/VitalFlow.git
cd VitalFlow
npm install

# .env.local
echo "DATABASE_URL=postgresql://neondb_owner:npg_oenD91CyGfzt@ep-small-king-ax9crxz7-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" > .env.local
echo "NEBIUS_API_KEY=v1.CmMKHHN0YXRpY2tleS1lMDB2MncyZ2p3azVzaGVhNWYSIXNlcnZpY2VhY2NvdW50LWUwMHJqcjMzZXZiZHo3MXZ6ODILCNqR59MGELncvTc6DAjXlP-eBxCAgJL0AUACWgNlMDA.AAAAAAAAAAE1kv8OSo0qZ-ncP6xDwJuwMmyZ0ttKzWdjnb4OFjYryqsVIKBMa1cu0qcmU4UFGKQbpEDLZ_1PMnXGgC5-RQYO" >> .env.local
echo "LLM_BASE_URL=https://api.tokenfactory.nebius.com/v1" >> .env.local
echo "LLM_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507" >> .env.local

npx prisma migrate deploy
npm run dev
# open http://localhost:3000
```

---

## 4. Verifying the live backend

```bash
# Session (creates a dev user/org on first call)
curl https://vitalflow-<hash>-hasbunallah.vercel.app/api/dev/session

# Real upload (triggers orchestrator)
curl -X POST -F "file=@tests/fixtures/sample-statement.csv" \
  https://vitalflow-<hash>-hasbunallah.vercel.app/api/upload

# Approve the funding draft that the orchestrator created
curl https://vitalflow-<hash>-hasbunallah.vercel.app/api/funding-outreach | jq -r '.fundingOutreach[0].id' | xargs -I{} \
  curl -X POST https://vitalflow-<hash>-hasbunallah.vercel.app/api/funding-outreach/{}/approve
```

All endpoints return real DB rows. The orchestrator makes real LLM calls (Qwen 3 30B via Nebius) and persists AgentRun, Recommendation, and FundingOutreach rows. None of it is mocked.
