# Deploy

Zero → working production. ~30-60 min.

## 0. Prereqs

Accounts:
- GCP (billing enabled)
- GitHub
- Anthropic API key — https://console.anthropic.com
- Optional: Neon (free Postgres), Upstash (free Redis), domain

CLIs: `gcloud`, `terraform >= 1.9`, `gh`, `docker`, `node 20+`, `pnpm`, `python 3.12`, `uv`.

```bash
gcloud auth login
gcloud auth application-default login
gh auth login
```

## 1. Local validation

```bash
./bootstrap.sh
```

Validates tools, starts services, runs tests, creates and pushes GitHub repo.

## 2. GCP project

```bash
export PROJECT_ID="driftguard-$(openssl rand -hex 3)"
export REGION="europe-west1"
export GH_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

gcloud projects create "$PROJECT_ID" --name="Driftguard"
gcloud config set project "$PROJECT_ID"

# Link billing (find your account)
gcloud beta billing accounts list
gcloud beta billing projects link "$PROJECT_ID" \
  --billing-account=<YOUR_BILLING_ACCOUNT_ID>
```

## 3. Bootstrap GCP foundations

```bash
cd infra/terraform/bootstrap
cat > terraform.tfvars <<EOF
gcp_project = "${PROJECT_ID}"
region      = "${REGION}"
github_repo = "${GH_REPO}"
EOF

terraform init
terraform apply
```

Capture outputs:

```bash
WIF_PROVIDER=$(terraform output -raw wif_provider)
DEPLOYER_SA=$(terraform output -raw deployer_sa)
TFSTATE_BUCKET=$(terraform output -raw tfstate_bucket)
cd ../../..
```

## 4. GitHub secrets and vars

```bash
gh secret set GCP_WIF_PROVIDER -b "$WIF_PROVIDER"
gh secret set GCP_DEPLOYER_SA -b "$DEPLOYER_SA"

gh variable set GCP_PROJECT -b "$PROJECT_ID"
gh variable set GCP_REGION -b "$REGION"
```

## 5. Populate Secret Manager

Random secrets:

```bash
echo -n "$(openssl rand -hex 32)" | \
  gcloud secrets versions add driftguard-secret-key --data-file=-
echo -n "$(openssl rand -hex 32)" | \
  gcloud secrets versions add driftguard-gh-webhook-secret --data-file=-
```

API keys:

```bash
echo -n "<your-anthropic-key>" | \
  gcloud secrets versions add driftguard-anthropic-key --data-file=-
echo -n "<your-infracost-key>" | \
  gcloud secrets versions add driftguard-infracost-key --data-file=-
```

## 6. Managed Postgres and Redis

Easiest path: Neon + Upstash (free tiers).

Neon:
1. Create project at https://neon.tech
2. Copy connection string, change driver to `asyncpg`:
   `postgresql+asyncpg://user:pass@host/db?sslmode=require`

```bash
echo -n "<neon-connection-string>" | \
  gcloud secrets versions add driftguard-database-url --data-file=-
```

Upstash:
1. Create Redis at https://upstash.com
2. Copy `rediss://` URL

```bash
echo -n "<upstash-redis-url>" | \
  gcloud secrets versions add driftguard-redis-url --data-file=-
```

## 7. First deploy

```bash
git commit --allow-empty -m "chore: trigger first deploy"
git push
gh run watch
```

The workflow auths via WIF, builds the image, pushes to Artifact Registry, runs `terraform apply`, smoke-tests `/api/v1/health`.

Get the URL:

```bash
gcloud run services describe driftguard-api --region="$REGION" --format='value(status.url)'
```

## 8. Run DB migrations

```bash
API_URL=$(gcloud run services describe driftguard-api --region="$REGION" --format='value(status.url)')

# Run alembic against the production DB once (local shell)
cd apps/api
export DATABASE_URL="<same-as-secret-with-asyncpg-driver>"
uv run alembic upgrade head
cd ../..
```

(Later: turn this into a Cloud Run job triggered by the deploy workflow.)

## 9. GitHub App

1. Create at https://github.com/settings/apps/new
   - Name: pick one
   - Homepage URL: `$API_URL`
   - Webhook URL: `${API_URL}/api/v1/webhooks/github`
   - Webhook secret: paste the value you set for `driftguard-gh-webhook-secret`
2. Permissions:
   - Pull requests: Read & write
   - Contents: Read
   - Metadata: Read (default)
3. Subscribe to events: **Pull request**
4. Where can this app be installed: Any account (or only yours for now)
5. Save → note the App ID → Generate a private key (downloads `.pem`)

Upload to Secret Manager:

```bash
gh_app_id=<APP_ID>
echo -n "$gh_app_id" | \
  gcloud secrets versions add driftguard-gh-app-id --data-file=-
gcloud secrets versions add driftguard-gh-app-pk --data-file=- < <path-to-downloaded.pem>
```

Re-deploy so Cloud Run picks up new secret versions:

```bash
gh workflow run deploy-api.yml
gh run watch
```

## 10. Install the App on a test repo

1. Open your App's public page → Install → pick a repo with Terraform code
2. Open a PR in that repo
3. Check Cloud Run logs:

```bash
gcloud run services logs read driftguard-api --region="$REGION" --limit=50
```

You should see `github_event` with `action=opened`.

## 11. Web (optional)

Deploy `apps/web` to Vercel:

```bash
cd apps/web
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL production  # paste $API_URL
npx vercel env add RESEND_API_KEY production
npx vercel env add RESEND_AUDIENCE_ID production
npx vercel --prod
```

## Common issues

| Symptom | Likely cause |
|---|---|
| `permission denied` on WIF | `github_repo` in bootstrap doesn't match `gh repo view` exactly (case-sensitive) |
| Webhook 401 | webhook secret in GitHub App ≠ `driftguard-gh-webhook-secret` value |
| Cloud Run starts but secrets empty | new secret version added without redeploying — re-run `deploy-api` |
| `asyncpg.exceptions.InvalidCatalogNameError` | DB URL points to db that doesn't exist; create it in Neon |
| Workflow can't push to Artifact Registry | deployer SA missing `artifactregistry.writer` — re-run bootstrap |
