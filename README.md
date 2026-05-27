# DriftGuard

> AI runtime safety for Terraform and OpenTofu agents.
> Reviews every PR for cost delta, security, drift, and compliance — in under 2 seconds.

[![CI](https://github.com/UP2CLOUD/driftguard/actions/workflows/ci-api.yml/badge.svg)](https://github.com/UP2CLOUD/driftguard/actions)
[![Web](https://github.com/UP2CLOUD/driftguard/actions/workflows/ci-web.yml/badge.svg)](https://github.com/UP2CLOUD/driftguard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live demo:** https://driftguard-blue.vercel.app

---

## What it does

DriftGuard is a GitHub App that reviews every Terraform / OpenTofu PR:

| Engine | What it checks |
|---|---|
| **Static scanner** | IAM wildcards, public S3, open SGs, force_destroy, missing encryption, privileged K8s containers, unpinned GHA actions |
| **Risk scorer** | Deterministic 0–100 score from 70 resource type weights |
| **AI review** | Claude summarises findings and generates remediation advice |
| **Compliance** | DORA Art.11, NIS2 Art.21, ISO 27001 A.8.8 mapped to each finding |

---

## Quickstart — local development

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ and pnpm (web)
- Python 3.12+ and uv (api)

### 1. Clone and configure

```bash
git clone https://github.com/UP2CLOUD/driftguard.git
cd driftguard
cp .env.example .env
# Fill in at minimum: AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
# All other services are optional for local dev
```

### 2. Start the full stack

```bash
docker compose up -d
# postgres + redis + api + celery worker + web
```

Wait ~20s for migrations to run, then open:
- **App:** http://localhost:3000
- **API:** http://localhost:8000/docs
- **API health:** http://localhost:8000/api/v1/health

### 3. Run your first scan (no GitHub App needed)

```bash
# Create test Terraform files
mkdir test-iac && cat > test-iac/main.tf << 'HCL'
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  acl    = "public-read"
}
resource "aws_db_instance" "prod" {
  skip_final_snapshot = true
  publicly_accessible = true
}
HCL
tar czf test.tar.gz test-iac/

# Upload via API
curl -X POST http://localhost:8000/api/v1/scans/upload \
  -F "file=@test.tar.gz" \
  -F "installation_id=999"
```

Expected findings: `TF013` (public ACL), `TF004` (skip_final_snapshot), `TF014` (publicly_accessible).

---

## Repository structure

```
apps/
  api/                    FastAPI backend
    driftguard/
      api/v1/             REST endpoints
      db/                 SQLAlchemy models + Alembic migrations
      services/
        scanner/          Deterministic IaC scanner (TF/K8s/GHA)
        analysis/         AI review layer (Claude, grounded)
        terraform/        Plan parser + risk scorer
      worker/             Celery tasks
      events/             Typed event schemas (Redis Streams)
      middleware/         RBAC + API token auth
  web/                    Next.js 15 frontend
    app/                  App Router pages
    components/           React components
    messages/             i18n: 561 keys × 6 locales
infra/
  k8s/                    Kubernetes manifests
  terraform/              GKE / Postgres HA / Redis HA modules
  helm/                   Self-hosted Helm chart values
```

---

## Development commands

### API

```bash
cd apps/api

# Install deps
uv sync

# Run dev server (auto-reload)
uv run uvicorn driftguard.main:app --reload

# Run tests
uv run pytest tests/ -q --ignore=tests/eval

# Lint + format
uv run ruff check . && uv run ruff format .

# Database migrations
uv run alembic upgrade head

# Seed demo data
uv run python -m driftguard.db.seed
```

### Web

```bash
cd apps/web

# Install deps
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Validate i18n (561 keys, 6 locales, 0 gaps)
pnpm validate-i18n

# Type check
npx tsc --noEmit
```

---

## Environment variables

See `.env.example` for the full reference. Minimum required for local dev:

```bash
AUTH_SECRET=<openssl rand -hex 32>
AUTH_GITHUB_ID=<github oauth app id>
AUTH_GITHUB_SECRET=<github oauth app secret>
```

Everything else (Anthropic, Stripe, Infracost, Slack) is optional — the app degrades gracefully.

---

## GitHub App setup

1. Go to https://github.com/settings/apps → New GitHub App
2. Set **Webhook URL** to `https://your-domain.com/api/v1/webhooks/github`
3. Set **Permissions:** Repository contents (read), Pull requests (read/write), Checks (write)
4. Set **Events:** Pull request, Push
5. Copy App ID, Private Key (PEM), Webhook Secret → `.env`

For local testing with webhooks, use [smee.io](https://smee.io) or ngrok.

---

## Scanner rules

### Terraform (14 rules)
| Rule | Severity | Check |
|------|----------|-------|
| TF001 | CRITICAL | IAM policy `Resource: *` |
| TF003 | HIGH | `force_destroy = true` on storage |
| TF004 | HIGH | RDS `skip_final_snapshot = true` |
| TF005 | MEDIUM | RDS missing `deletion_protection` |
| TF006 | HIGH | Plaintext secrets in attributes |
| TF007 | HIGH | Security group open to `0.0.0.0/0` |
| TF010 | MEDIUM | EBS volume not encrypted |
| TF012 | HIGH | IAM `Action: *` |
| TF013 | CRITICAL | S3 bucket public ACL |
| TF014 | CRITICAL | RDS `publicly_accessible = true` |

### Kubernetes (8 rules)
| Rule | Severity | Check |
|------|----------|-------|
| K8S001 | CRITICAL | Privileged container |
| K8S002 | MEDIUM | Missing resource limits |
| K8S003 | CRITICAL/HIGH | `hostPID` / `hostNetwork` |
| K8S004 | MEDIUM | Running as root |
| K8S005 | HIGH | `allowPrivilegeEscalation: true` |
| K8S006 | MEDIUM | Image with `:latest` tag |
| K8S007 | LOW | Missing `readinessProbe` |
| K8S009 | LOW | Writable root filesystem |

### GitHub Actions (6 rules)
| Rule | Severity | Check |
|------|----------|-------|
| GHA001 | HIGH | Unpinned action (`@main` / `@v1`) |
| GHA002 | CRITICAL | `ACTIONS_ALLOW_UNSECURE_COMMANDS` |
| GHA003 | CRITICAL | Script injection via `${{ github.event.* }}` |
| GHA004 | MEDIUM | Missing `permissions:` block |
| GHA005 | CRITICAL | `pull_request_target` + unsafe checkout |
| GHA007 | HIGH | `curl \| bash` pattern |

---

## API reference

Interactive docs at http://localhost:8000/docs when running locally.

Key endpoints:

```
POST /api/v1/scans/upload        Upload tar.gz, scan immediately
POST /api/v1/scans/trigger       Queue background scan of GitHub repo
GET  /api/v1/scans/{id}          Get scan results + findings + AI review

GET  /api/v1/dashboard/overview  Dashboard stats for an installation
GET  /api/v1/orgs/by-installation/{id}  Get org for an installation

WS   /api/v1/ws/events/{org_id}  Live event stream (requires API token)
```

---

## Deployment

### Vercel + Cloud Run (recommended for SaaS)

```bash
# Deploy API to Cloud Run
gcloud run deploy driftguard-api \
  --source apps/api \
  --region europe-west1 \
  --set-env-vars DATABASE_URL=...,REDIS_URL=...

# Web deploys automatically on push via Vercel integration
```

### Self-hosted (Docker Compose)

```bash
docker compose up -d
# Runs: postgres, redis, api, celery worker, web
```

### Self-hosted (Kubernetes)

```bash
helm install driftguard infra/helm/driftguard \
  -f infra/helm/driftguard/values.yaml \
  --namespace driftguard --create-namespace
```

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 + pgvector (semantic memory) |
| Queue | Redis + Celery |
| AI | Anthropic Claude (claude-haiku-4-5-20251001) |
| Auth | NextAuth v5 + GitHub OAuth |
| i18n | 561 keys × 6 locales (EN, PT-BR, ES, ZH, HI, AR) |
| Infra | GKE, Terraform, Helm, ArgoCD, CloudNativePG |
| Observability | OpenTelemetry, Prometheus, Loki, Tempo, Grafana |

---

## Contributing

```bash
# Run all checks before pushing
cd apps/api  && uv run pytest -q && uv run ruff check .
cd apps/web  && pnpm build && pnpm validate-i18n
```

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

MIT © 2026 UP2CLOUD
