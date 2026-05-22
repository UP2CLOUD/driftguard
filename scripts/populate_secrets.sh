#!/usr/bin/env bash
# Populate GCP Secret Manager with required values
# Usage: edit the VALUES section below, then run ./scripts/populate_secrets.sh
set -euo pipefail

PROJECT_ID="${GCP_PROJECT:?Set GCP_PROJECT env var}"
GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}▸ $*${NC}"; }

_secret() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    echo "  SKIP $name (empty)"
    return
  fi
  echo -n "$value" | gcloud secrets versions add "$name" \
    --project="$PROJECT_ID" --data-file=-
  echo "  SET  $name"
}

# ── FILL THESE VALUES ────────────────────────────────────────────────────────
DATABASE_URL=""          # postgresql+asyncpg://user:pass@host/db
REDIS_URL=""             # rediss://:password@host:port
SECRET_KEY=""            # openssl rand -hex 32
GH_APP_ID=""             # GitHub App ID (number)
GH_APP_PK=""             # cat path/to/private-key.pem
GH_WEBHOOK_SECRET=""     # the secret you set in GitHub App settings
ANTHROPIC_KEY=""         # sk-ant-api03-...
OPENAI_KEY=""            # sk-... (optional)
INFRACOST_KEY=""         # (optional)
RESEND_KEY=""            # re_... (optional)
SENTRY_DSN=""            # (optional)
POSTHOG_KEY=""           # (optional)
R2_ENDPOINT=""           # https://<id>.r2.cloudflarestorage.com (optional)
R2_ACCESS_KEY=""         # (optional)
R2_SECRET_KEY=""         # (optional)
STRIPE_SECRET=""         # sk_test_... (optional)
STRIPE_WEBHOOK_SECRET="" # whsec_... (optional)
# ────────────────────────────────────────────────────────────────────────────

info "Populating secrets in project: $PROJECT_ID"
_secret driftguard-database-url        "$DATABASE_URL"
_secret driftguard-redis-url           "$REDIS_URL"
_secret driftguard-secret-key          "$SECRET_KEY"
_secret driftguard-gh-app-id           "$GH_APP_ID"
_secret driftguard-gh-app-pk           "$GH_APP_PK"
_secret driftguard-gh-webhook-secret   "$GH_WEBHOOK_SECRET"
_secret driftguard-anthropic-key       "$ANTHROPIC_KEY"
_secret driftguard-openai-key          "$OPENAI_KEY"
_secret driftguard-infracost-key       "$INFRACOST_KEY"
_secret driftguard-resend-key          "$RESEND_KEY"
_secret driftguard-sentry-dsn          "$SENTRY_DSN"
_secret driftguard-posthog-key         "$POSTHOG_KEY"
_secret driftguard-r2-endpoint         "$R2_ENDPOINT"
_secret driftguard-r2-access-key       "$R2_ACCESS_KEY"
_secret driftguard-r2-secret-key       "$R2_SECRET_KEY"
_secret driftguard-stripe-secret       "$STRIPE_SECRET"
_secret driftguard-stripe-webhook-secret "$STRIPE_WEBHOOK_SECRET"
info "Done"
