# Free Deployment Guide — DriftGuard API

Deploy the DriftGuard API + worker on a fully free stack, no credit card required.

| Layer        | Service       | Free tier limits                                            |
|--------------|---------------|-------------------------------------------------------------|
| API + worker | **Fly.io**    | 3 shared-cpu VMs, 256MB+ RAM each. No card required up to 3 small apps. |
| Postgres     | **Neon**      | 0.5GB storage, pgvector pre-installed, auto-suspend after inactivity. No card. |
| Redis        | **Upstash**   | 10,000 commands/day, 256MB storage. No card. |

Total cost: **€0/mo** for hobby / pre-revenue usage.

Total setup time: **~20 minutes**.

---

## Step 1 — Provision Postgres (Neon)

1. Sign up at https://console.neon.tech (GitHub login)
2. Create project: `driftguard` · Region: **EU-Central (Frankfurt)** (closest to Fly.io `fra`)
3. Postgres version: **16** (pgvector requires PG ≥ 13)
4. Copy the **connection string** — format:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
5. **Enable pgvector**: Click "SQL Editor" → run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

Convert the URL to async format for DriftGuard:
- Original: `postgresql://...`
- For DriftGuard: `postgresql+asyncpg://...`
- Add `?ssl=require` instead of `?sslmode=require` (asyncpg uses `ssl=` not `sslmode=`)

Final value:
```
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?ssl=require
```

---

## Step 2 — Provision Redis (Upstash)

1. Sign up at https://console.upstash.com (GitHub login)
2. Create database: `driftguard-redis` · Region: **EU-West-1 (Ireland)** or **eu-central-1**
3. Type: **Regional**, **Free tier**
4. Copy the **Redis URL** (under "Endpoints" → "Redis URL")
   ```
   rediss://default:PASSWORD@xxx.upstash.io:6379
   ```

Note: `rediss://` (with double `s`) is **TLS**, required by Upstash. The DriftGuard config supports this directly.

---

## Step 3 — Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Linux / WSL
curl -L https://fly.io/install.sh | sh

# Verify
fly version
```

Sign up + log in:
```bash
fly auth signup     # GitHub login, no credit card needed
fly auth login      # if already signed up
```

---

## Step 4 — Initial Fly app launch

From the repo root:

```bash
cd apps/api
fly launch --copy-config --no-deploy --name driftguard-api --region fra
```

This will:
- Detect the `Dockerfile`
- Use the `fly.toml` already in the repo
- Skip the first deploy (we need to set secrets first)

**If you see "App name unavailable"**, change `--name driftguard-api` to something else and update `app =` in `apps/api/fly.toml`.

---

## Step 5 — Set Fly secrets

These are encrypted and injected as env vars at runtime:

```bash
fly secrets set \
  DATABASE_URL="postgresql+asyncpg://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?ssl=require" \
  REDIS_URL="rediss://default:PASSWORD@xxx.upstash.io:6379" \
  SECRET_KEY="$(openssl rand -hex 32)" \
  STRIPE_API_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_TEAM="price_1TbRyCQqEpNlaCn6JqZoWy26" \
  STRIPE_PRICE_PRO="price_1TbRyCQqEpNlaCn6vv79U1aS" \
  PUBLIC_BASE_URL="https://driftguard-blue.vercel.app" \
  ANTHROPIC_API_KEY="sk-ant-..." \
  GITHUB_APP_ID="123456" \
  GITHUB_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
  -a driftguard-api
```

**Required minimum** (for billing to work):
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_TEAM`
- `PUBLIC_BASE_URL`

The GitHub App + Anthropic keys can come later — billing doesn't depend on them.

---

## Step 6 — First deploy

```bash
fly deploy -a driftguard-api
```

First build takes ~5 min (uv install + Terraform + Infracost binaries).
Subsequent deploys are ~30s thanks to Docker layer caching.

When done, you'll see:
```
Visit your newly deployed app at https://driftguard-api.fly.dev
```

Test the health endpoint:
```bash
curl https://driftguard-api.fly.dev/api/v1/health
# {"status":"ok"}
```

---

## Step 7 — Run database migrations

```bash
fly ssh console -a driftguard-api -C "alembic upgrade head"
```

This creates all DriftGuard tables in Neon Postgres.

If `alembic` isn't in PATH, use:
```bash
fly ssh console -a driftguard-api -C "uv run alembic upgrade head"
```

---

## Step 8 — Update Stripe webhook URL

Your webhook is currently pointing to `https://api.driftguard.io/api/v1/webhooks/stripe` (the placeholder from earlier setup). Update it to the real Fly URL:

```bash
curl https://api.stripe.com/v1/webhook_endpoints/we_1TbRyLQqEpNlaCn6rMdCw5XU \
  -u "sk_test_YOUR_KEY:" \
  -d "url=https://driftguard-api.fly.dev/api/v1/webhooks/stripe"
```

Or in the Stripe Dashboard → Developers → Webhooks → click endpoint → Update endpoint.

---

## Step 9 — Update Vercel env vars

On Vercel → driftguard project → Settings → Environment Variables:

| Variable              | Value                                       |
|-----------------------|---------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://driftguard-api.fly.dev`            |
| `SECRET_KEY`          | (same value you set on Fly in Step 5)       |

Redeploy Vercel (Deployments → Redeploy latest).

---

## Step 10 — End-to-end test

1. Open https://driftguard-blue.vercel.app/#pricing
2. Click **"Start free trial →"** under Team plan
3. Sign in with GitHub → land on dashboard → auto-redirected to Stripe Checkout
4. Use test card `4242 4242 4242 4242`, any future expiry, any CVC
5. Complete payment → redirected back to `/dashboard?checkout=success`
6. Verify subscription was created:
   ```bash
   fly ssh console -a driftguard-api -C "uv run python -c '
   import asyncio
   from sqlalchemy import select
   from driftguard.core.db import AsyncSessionLocal
   from driftguard.db.models import Organization
   async def m():
     async with AsyncSessionLocal() as db:
       r = await db.execute(select(Organization))
       for o in r.scalars(): print(o.id, o.plan, o.stripe_customer_id)
   asyncio.run(m())
   '"
   ```

You should see `plan=team`.

---

## Operating cost considerations

### Fly.io free tier specifics

- Free tier covers up to **3 shared-cpu-1x VMs with 256MB RAM** each, plus **3GB persistent volume** and **160GB outbound bandwidth/month**.
- `auto_stop_machines = "stop"` in `fly.toml` stops VMs when idle → no usage charges. They restart on incoming traffic (cold start ~2-3s).
- The first request after sleep is slow. Stripe webhooks retry automatically on timeout, so this is fine.
- The worker process is configured in `fly.toml` but isn't running by default. To start it:
  ```bash
  fly scale count app=1 worker=1 -a driftguard-api
  ```
  Note: a second VM = uses another free machine slot.

### Neon free tier

- 0.5GB storage is generous for the first 1000+ orgs
- Auto-suspends after 5 min of no queries → first query after suspend is slow (~500ms cold start)
- Free tier doesn't include point-in-time-restore; for production, upgrade or take periodic logical backups

### Upstash free tier

- 10k commands/day is enough for low-volume Celery use (each task = 5-10 commands)
- Watch the dashboard; if you hit limits, upgrade to pay-per-use ($0.2 / 100k requests)

---

## Upgrading later

When you outgrow the free tier:

| Scenario | Move to |
|---|---|
| API latency (cold starts hurt UX) | Fly paid plan ($5/mo for always-on `shared-cpu-1x`) |
| Postgres > 0.5GB | Neon paid ($19/mo) or Supabase free (500MB) → AWS RDS / Cloud SQL |
| Redis > 10k cmd/day | Upstash pay-as-you-go ($0.2/100k) |
| Need always-on worker | Add a paid Fly machine, or move worker to Cloud Run (scales to zero) |

---

## Troubleshooting

### `fly deploy` fails with "no such file or directory: pyproject.toml"
Run from `apps/api/`, not from repo root. The `Dockerfile` and `fly.toml` are inside `apps/api/`.

### Migrations fail with `ssl/sslmode mismatch`
Make sure `DATABASE_URL` uses `?ssl=require` (asyncpg syntax), not `?sslmode=require` (psycopg syntax).

### `pgvector` extension errors
Re-run `CREATE EXTENSION vector;` in the Neon SQL Editor. Then redeploy and re-run migrations.

### Stripe webhook 401 in Fly logs
- Check `STRIPE_WEBHOOK_SECRET` in `fly secrets list` matches Stripe Dashboard → Webhooks → endpoint → Signing secret
- The secret rotates if you delete + recreate the webhook endpoint

### Cold-start timeouts
The Fly VM takes ~2-3s to start after `auto_stop_machines`. Stripe webhook timeouts are 30s, GitHub webhooks are 10s — both should be fine. If you see consistent timeouts on user-facing requests, set `min_machines_running = 1` (uses one full free machine slot).
