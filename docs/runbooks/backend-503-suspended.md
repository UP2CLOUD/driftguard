# Runbook — Production dashboard shows API 503 ("backend unavailable")

**Symptom:** `https://driftguard-blue.vercel.app/dashboard/<installationId>` loads but
shows `Backend temporarily unavailable (HTTP 503)` / `Dashboard data may be incomplete`.
Authenticated dashboard data (overview, repos, analyses) does not load.

## Architecture (request path)

```
Browser → Vercel frontend (driftguard-blue)
            └─ server component fetches NEXT_PUBLIC_API_URL
                 └─ https://driftguard-vozi.onrender.com  (FastAPI backend on Render)
                      └─ Postgres (DATABASE_URL)
```

`NEXT_PUBLIC_API_URL` is set in **Vercel → Project Settings → Environment Variables**
and is inlined at build time. The backend and its secrets live on **Render**.

## Diagnosis

Probe the backend directly. Use `/health` for liveness (is the process up?) and
`/ready` for readiness (can it reach the database and Redis?). `/ready` returns
`503` with `"status": "degraded"` when a dependency check fails, even if the
process itself is alive.

```bash
# Liveness — is the process running at all?
curl -s -o /dev/null -w "%{http_code}\n" https://driftguard-vozi.onrender.com/api/v1/health
curl -s https://driftguard-vozi.onrender.com/api/v1/health   # read the body

# Readiness — database & Redis connectivity
curl -s https://driftguard-vozi.onrender.com/api/v1/ready
```

| Observation | Meaning | Fix |
|---|---|---|
| Body: `This service has been suspended` + fast `503` | **Render account/billing suspension** | Resume the service (below). A redeploy will NOT clear this. |
| Slow first response (~30 s) then `200` | Free-tier cold start (spun down after 15 min idle) | None needed; consider keep-warm or paid plan. |
| Connection refused / timeout | Service crashed or deleted | Redeploy / recreate. |
| `/health` is `200` but `/ready` is `503` with `"status": "degraded"` | Process is up but **database or Redis is unreachable** | Check the dependency (`DATABASE_URL`, `REDIS_URL`) status and credentials. |
| `200` from backend but dashboard still 503 | Vercel `NEXT_PUBLIC_API_URL` points elsewhere | Fix the Vercel env var, redeploy. |

The "suspended" body with an immediate 503 is an **account-level state on Render**, not a
code problem. It cannot be cleared by pushing code, triggering the `deploy-render` workflow,
or any CI action — those have no authority over billing.

## Resolution

### Option A — Resume Render (fastest; preserves data)
1. Go to **https://dashboard.render.com** → service **`driftguard-vozi`**.
2. Clear the billing hold / re-enable the service (Settings → Resume, or update payment).
3. Wait for the service to report **Live**, then re-probe `/api/v1/health` → expect `200`.
   No Vercel change or redeploy is required — the URL is unchanged.
4. To prevent recurrence: upgrade from **Free** to **Starter** (`render.yaml` → `plan: starter`)
   so the service is always-on and not subject to free-tier suspension.

### Option B — Migrate to a new host (if the Render account is gone)
Requires the secrets that currently live only in the Render dashboard:
`DATABASE_URL`, `SECRET_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` (see `render.yaml` for the full list).

1. Deploy `apps/api` (Dockerfile) to the new host with those env vars set.
2. Point the **GitHub App webhook URL** (GitHub → Settings → Developer settings →
   GitHub Apps → your app → General → Webhook URL) at the new backend.
3. Set **Vercel `NEXT_PUBLIC_API_URL`** to the new backend URL and redeploy the web app.
4. Re-probe `/api/v1/health` → expect `200`.

> Keeping the existing `DATABASE_URL` preserves history. A fresh database starts empty
> (the dashboard will show the onboarding/"install the app" state until data repopulates).

## What the frontend already does during an outage

`apps/web/app/dashboard/[installationId]/_sections/ReadinessChecklist.tsx` distinguishes
backend states and renders a specific, non-alarming banner for `503` rather than crashing:
the page itself still returns `200`. This is intentional graceful degradation — it does not
mask the outage, and it clears automatically once the backend returns `200`.

## Verification

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://driftguard-vozi.onrender.com/api/v1/health   # 200
# then reload the dashboard — the 503 banner is gone and data loads.
```
