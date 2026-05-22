# GCP Setup — DriftGuard from zero

> Tempo estimado: 30–45 min

## Pré-requisitos (instalar uma vez)

```bash
# macOS
brew install google-cloud-sdk terraform gh

# gcloud auth
gcloud auth login
gcloud auth application-default login
```

---

## Step 1 — Criar projecto GCP

```bash
# Escolhe um ID único (letras minúsculas, números, hífens, 6-30 chars)
export PROJECT_ID="driftguard-prod"        # <-- muda aqui
export REGION="europe-west1"
export GITHUB_REPO="UP2CLOUD/driftguard"   # não mudar

# Criar projecto
gcloud projects create $PROJECT_ID --name="DriftGuard"

# Ligar billing (obrigatório para Cloud Run)
# Lista as billing accounts disponíveis:
gcloud billing accounts list

# Copia o BILLING_ACCOUNT_ID da lista e cola abaixo:
export BILLING_ID="XXXXXX-XXXXXX-XXXXXX"   # <-- muda aqui
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ID

# Definir projecto por defeito
gcloud config set project $PROJECT_ID
```

---

## Step 2 — Bootstrap Terraform (APIs + tfstate + SA + WIF + Secrets)

```bash
cd infra/terraform/bootstrap

# Inicializar (state local para o bootstrap)
terraform init

# Preview
terraform plan \
  -var="gcp_project=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repo=$GITHUB_REPO"

# Aplicar (demora ~3min — activa APIs)
terraform apply \
  -var="gcp_project=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repo=$GITHUB_REPO"
```

Guardar os outputs (vais precisar deles):

```bash
terraform output
# Nota:
#   wif_provider     → GitHub secret GCP_WIF_PROVIDER
#   deployer_sa      → GitHub secret GCP_DEPLOYER_SA
#   tfstate_bucket   → bucket para envs/dev
#   artifact_registry_url → base URL das imagens
```

---

## Step 3 — Serviços externos (Neon + Upstash + R2)

### Neon (PostgreSQL com pgvector)
1. Ir a https://neon.tech → New project → "driftguard"
2. Activar extensão pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copiar a connection string: `postgresql://user:pass@host/dbname?sslmode=require`
4. Converter para asyncpg: substituir `postgresql://` por `postgresql+asyncpg://`

### Upstash (Redis para Celery)
1. Ir a https://console.upstash.com → New database → "driftguard" → Frankfurt
2. Copiar a URL TLS: `rediss://:password@host:port`

### Cloudflare R2 (opcional — planos Terraform)
1. Ir a https://dash.cloudflare.com → R2 → New bucket → "driftguard-plans"
2. Criar API token com permissão R2
3. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Step 4 — Popular secrets no Secret Manager

```bash
# Helper: popular um secret
_secret() {
  echo -n "$2" | gcloud secrets versions add "$1" \
    --project=$PROJECT_ID --data-file=-
}

# Obrigatórios
_secret driftguard-database-url   "postgresql+asyncpg://user:pass@host/dbname"
_secret driftguard-redis-url      "rediss://:password@host:port"
_secret driftguard-secret-key     "$(openssl rand -hex 32)"
_secret driftguard-gh-app-id      "SEU_GITHUB_APP_ID"
_secret driftguard-gh-app-pk      "$(cat sua-chave-privada.pem)"
_secret driftguard-gh-webhook-secret "SEU_WEBHOOK_SECRET"
_secret driftguard-anthropic-key  "sk-ant-api03-..."

# Opcionais (pode deixar vazio para começar)
_secret driftguard-openai-key     ""
_secret driftguard-infracost-key  ""
_secret driftguard-resend-key     ""
_secret driftguard-sentry-dsn     ""
_secret driftguard-posthog-key    ""
_secret driftguard-r2-endpoint    ""
_secret driftguard-r2-access-key  ""
_secret driftguard-r2-secret-key  ""
_secret driftguard-stripe-secret  ""
_secret driftguard-stripe-webhook-secret ""
```

---

## Step 5 — GitHub Actions secrets/vars

```bash
# Usar os outputs do Step 2
gh secret set GCP_WIF_PROVIDER   --body="projects/.../workloadIdentityPools/..."
gh secret set GCP_DEPLOYER_SA    --body="driftguard-deployer@$PROJECT_ID.iam.gserviceaccount.com"
gh secret set ANTHROPIC_API_KEY  --body="sk-ant-api03-..."

gh variable set GCP_PROJECT  --body="$PROJECT_ID"
gh variable set GCP_REGION   --body="$REGION"
```

---

## Step 6 — Primeiro deploy

```bash
# Fazer build + deploy da imagem para Cloud Run
gh workflow run deploy-api.yml -f environment=dev

# Acompanhar
gh run watch
```

Quando terminar (~5 min), obter o URL do serviço:

```bash
gcloud run services describe driftguard-api \
  --region=$REGION \
  --format="value(status.url)"
# Ex: https://driftguard-api-xxxxx-ew.a.run.app
export API_URL="https://driftguard-api-xxxxx-ew.a.run.app"
```

---

## Step 7 — Migrações + seed

```bash
# Migrations (corre localmente contra o Neon)
cd apps/api
DATABASE_URL="postgresql+asyncpg://..." \
  uv run alembic upgrade head

# Seed de demo (instala dados de exemplo)
DATABASE_URL="postgresql+asyncpg://..." \
  uv run python -m driftguard.db.seed
```

---

## Step 8 — GitHub App webhook URL

1. Ir a https://github.com/settings/apps/driftguard-app
2. Webhook URL: `$API_URL/api/v1/webhooks/github`
3. Content type: `application/json`
4. Verificar "Send me everything" ou pelo menos:
   - Pull requests
   - Installation
   - Installation repositories

---

## Step 9 — Vercel environment variables

No dashboard Vercel do `driftguard-blue.vercel.app`:

```
NEXT_PUBLIC_API_URL                = https://driftguard-api-xxxxx-ew.a.run.app
NEXT_PUBLIC_GITHUB_APP_SLUG        = driftguard-app
NEXT_PUBLIC_GITHUB_APP_INSTALL_URL = https://github.com/apps/driftguard-app/installations/new
SECRET_KEY                         = (mesmo valor de driftguard-secret-key do Secret Manager)
```

Depois de guardar → **Redeploy** no Vercel.

---

## Step 10 — Verificar

```bash
# API health
curl $API_URL/api/v1/health

# Dashboard overview (com a tua installation_id)
curl "$API_URL/api/v1/dashboard/overview?installation_id=133548351"

# Testar webhook handler
curl -X POST $API_URL/api/v1/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"zen":"Keep it logically awesome"}'
```

---

## Troubleshooting rápido

| Problema | Causa | Fix |
|---|---|---|
| Cloud Run 403 | Service account sem permissão | `gcloud run services add-iam-policy-binding` |
| Secret não encontrado | Secret não populado | `gcloud secrets versions add` |
| DB connection timeout | Neon IP não autorizado | Neon → Settings → Trusted IPs → allow all |
| Webhook 401 | GITHUB_WEBHOOK_SECRET errado | Comparar com o valor no GitHub App |
