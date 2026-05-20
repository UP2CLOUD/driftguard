# DriftGuard API — Deploy Runbook

## Prerequisites

```bash
brew install google-cloud-sdk terraform
gcloud auth login
gcloud auth application-default login
```

---

## Step 1 — Create GCP project

```bash
export PROJECT_ID=driftguard-prod   # change if taken
export REGION=europe-west1
export BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" | head -1)

gcloud projects create $PROJECT_ID --name="DriftGuard"
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
gcloud config set project $PROJECT_ID
```

---

## Step 2 — Bootstrap infra (APIs + tfstate + SA + WIF)

```bash
cd infra/terraform/bootstrap

# First apply — no remote state yet (bootstraps the bucket)
terraform init
terraform apply \
  -var="gcp_project=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_org=UP2CLOUD" \
  -var="github_repo=driftguard"
```

This creates:
- GCS bucket `$PROJECT_ID-tfstate` (versioned, audit-logged)
- Artifact Registry repo `driftguard`
- Service account `driftguard-deployer` with minimal roles
- Workload Identity Federation pool for GitHub Actions (keyless)

Outputs you need for Step 4:
```bash
terraform output wif_provider   # → GCP_WIF_PROVIDER
terraform output deployer_sa    # → GCP_DEPLOYER_SA
```

---

## Step 3 — Provision external services

### 3a. Postgres (Neon — recommended for cost)

```
1. https://neon.tech → New project → "driftguard-prod" → Region: eu-central-1
2. Copy connection string (pooler URL):
   postgresql+asyncpg://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 3b. Redis (Upstash)

```
1. https://console.upstash.com → New database → EU region → TLS enabled
2. Copy: rediss://default:<password>@<host>.upstash.io:6379
```

### 3c. Cloudflare R2 (plan outputs)

```
1. Cloudflare dashboard → R2 → Create bucket "driftguard-plans"
2. R2 → Manage API tokens → Create token (Object Read & Write)
3. Endpoint: https://<account_id>.r2.cloudflarestorage.com
```

### 3d. Other services

| Service | Action |
|---|---|
| **Anthropic** | https://console.anthropic.com → API keys |
| **Infracost** | `infracost auth login` → copy key |
| **Resend** | https://resend.com → Add domain driftguard.io → API key |
| **Sentry** | https://sentry.io → New project "driftguard-api" → DSN |
| **PostHog** | https://eu.posthog.com → New project → API key |
| **Stripe** | Already configured — get webhook secret for Cloud Run URL |

---

## Step 4 — Write secrets to Secret Manager

```bash
# Helper
secret() { echo -n "$2" | gcloud secrets versions add "$1" --data-file=- 2>/dev/null \
  || echo -n "$2" | gcloud secrets create "$1" --data-file=- --replication-policy=automatic; }

# Core
secret driftguard-database-url  "postgresql+asyncpg://..."
secret driftguard-redis-url      "rediss://default:...@...upstash.io:6379"
secret driftguard-secret-key     "$(openssl rand -base64 32)"

# GitHub App (from apps/api/.env.local)
secret driftguard-gh-app-id       "3758793"
secret driftguard-gh-webhook-secret "6c9d87b7b81954a463e1deb1a65f524aea3f755ac9d86202472e78836ecfeada"
# Private key — keep newlines as \n
secret driftguard-gh-app-pk       "$(cat path/to/driftguard-app-private-key.pem | awk 'NF {printf "%s\\n", $0}')"

# AI + tools
secret driftguard-anthropic-key   "sk-ant-..."
secret driftguard-openai-key      "sk-..."       # optional fallback
secret driftguard-infracost-key   "ico_..."

# Observability + comms
secret driftguard-resend-key      "re_..."
secret driftguard-sentry-dsn      "https://...@sentry.io/..."
secret driftguard-posthog-key     "phc_..."

# R2
secret driftguard-r2-endpoint     "https://<account>.r2.cloudflarestorage.com"
secret driftguard-r2-access-key   "..."
secret driftguard-r2-secret-key   "..."

# Billing
secret driftguard-stripe-secret          "sk_live_..."
secret driftguard-stripe-webhook-secret  "whsec_..."
```

---

## Step 5 — Set GitHub Actions secrets/vars

Go to: **github.com/UP2CLOUD/driftguard → Settings → Secrets and variables → Actions**

### Repository variables (`vars.*`)
```
GCP_PROJECT   = driftguard-prod
GCP_REGION    = europe-west1
```

### Repository secrets (`secrets.*`)
```
GCP_WIF_PROVIDER  = projects/<number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider
GCP_DEPLOYER_SA   = driftguard-deployer@driftguard-prod.iam.gserviceaccount.com
```

---

## Step 6 — Run database migrations

```bash
# Temporary: port-forward via Cloud Run or connect directly to Neon
cd apps/api
DATABASE_URL="postgresql+asyncpg://..." uv run alembic upgrade head
```

This applies:
- `001_init_schema.py` — orgs, repos, PRs, analyses, findings, audit_log
- `002_pgvector_embeddings.py` — incident_embeddings with 384-d vector column

---

## Step 7 — Deploy

```bash
# From GitHub: Actions → deploy-api → Run workflow → environment: dev
# Or from CLI:
gh workflow run deploy-api.yml -f environment=dev
```

The workflow:
1. Runs CI (ruff + 53 pytest tests)
2. Validates Terraform
3. Authenticates to GCP via WIF (keyless — no service account key stored)
4. Builds Docker image → pushes to Artifact Registry
5. `terraform apply` — deploys API + Worker Cloud Run services
6. Smoke tests `/api/v1/health`

---

## Step 8 — Configure post-deploy

```bash
# Get the API URL
cd infra/terraform/envs/dev
terraform output api_url
# → https://driftguard-api-xxxx-ew.a.run.app
```

**Update in Vercel:**
```
NEXT_PUBLIC_API_URL = https://driftguard-api-xxxx-ew.a.run.app
SECRET_KEY          = <same value as driftguard-secret-key secret>
```

**Update GitHub App webhook URL:**
→ github.com/organizations/UP2CLOUD/settings/apps/driftguard-app
→ Webhook URL: `https://driftguard-api-xxxx-ew.a.run.app/api/v1/webhooks/github`

**Update Stripe webhook endpoint:**
→ dashboard.stripe.com → Webhooks → Add endpoint
→ URL: `https://driftguard-api-xxxx-ew.a.run.app/api/v1/webhooks/stripe`
→ Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

---

## Verify

```bash
# Health
curl https://driftguard-api-xxxx-ew.a.run.app/api/v1/health

# Test webhook (should return 401 without valid signature — correct)
curl -X POST https://driftguard-api-xxxx-ew.a.run.app/api/v1/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"zen":"test"}'
```

---

## Costs (estimate)

| Resource | Monthly |
|---|---|
| Cloud Run API (1 min instance) | ~€8 |
| Cloud Run Worker (1 min instance) | ~€8 |
| Neon Postgres (free tier) | €0 |
| Upstash Redis (free tier) | €0 |
| GCS tfstate | <€1 |
| Artifact Registry | <€1 |
| **Total** | **~€17/mo** |
