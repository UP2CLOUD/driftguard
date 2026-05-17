# Architecture

## Overview

```
            ┌──────────────┐
GitHub PR ─►│  Webhook API │──► enqueue
            │  (Cloud Run) │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │   Worker     │  clone repo (sparse)
            │  (BG task /  │  terraform plan
            │   Fly Machine│  parse plan.json
            │   later)     │  parallel:
            │              │   - infracost
            │              │   - drift compare
            │              │   - checkov
            │              │  LLM(findings)
            │              │  post PR comment
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  Postgres    │  orgs, repos, PRs,
            │              │  analyses, findings
            └──────────────┘
            ┌──────────────┐
            │   R2 / S3    │  plan.json, logs
            └──────────────┘
```

## Boundaries

- **API**: receives GitHub webhooks, exposes dashboard endpoints, handles billing webhooks.
- **Worker**: long-running analysis. In MVP runs in-process (background task). Will move to dedicated Fly Machine pool when:
  - p95 analysis > 60s
  - concurrent PRs > 100
  - need for retries/observability per job
- **Sandbox**: each terraform plan runs in an isolated environment with network allowlist (provider endpoints only). No long-lived cloud credentials persisted.

## Data flow

1. PR event → webhook signature verified
2. Background task → load installation token
3. Sparse-clone at `head_sha` → detect `*.tf` dirs
4. `terraform init -backend=false && terraform plan -out=tfplan.bin`
5. `terraform show -json tfplan.bin > plan.json`
6. Parallel runs of cost/drift/security analyzers → structured findings
7. AI reviewer composes markdown with hard guardrails (no invented numbers)
8. PR comment posted via GitHub API
9. Persist `Analysis` + `Finding` rows; `plan.json` to object storage (30d TTL)

## Tenancy

- Row-level isolation by `org_id`. Middleware enforces on every query.
- Storage prefixed: `s3://driftguard-plans/{org_id}/...`
- Per-org rate limiting via Redis token bucket.

## Observability

- Logs: structlog JSON → Cloud Logging
- Metrics: OpenTelemetry → Grafana Cloud
- LLM obs: Langfuse (later)
- Errors: Sentry
- Product: PostHog

## Security baseline

- GitHub App: PRs (read+write), Contents (read), Metadata. Nothing else.
- No long-lived cloud credentials of tenants stored. OIDC federation for plan execution when supported.
- All secrets in GCP Secret Manager, referenced by Cloud Run.
- TLS everywhere. Signed webhook payloads (HMAC SHA-256).
- Audit log table for every state-changing action.

## SLO targets

| Metric | MVP | GA |
|---|---|---|
| PR review p95 | < 90s | < 30s |
| API p99 | < 500ms | < 300ms |
| Uptime | 99.5% | 99.9% |
| AI cost per review | < €0.10 | < €0.05 |
