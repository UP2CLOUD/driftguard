#!/usr/bin/env bash
# Deploy DriftGuard API to Fly.io (free tier)
# Usage: ./deploy-fly.sh [--first-time]
#
# Prerequisites:
#   brew install flyctl
#   fly auth login
#   Fill in all YOUR_* values in ../../.env first

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example and fill in credentials."
  exit 1
fi

# Load env file (strip comments and blank lines)
set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

# Check required credentials are filled in
REQUIRED=(DATABASE_URL REDIS_URL GITHUB_APP_ID GITHUB_APP_PRIVATE_KEY GITHUB_WEBHOOK_SECRET ANTHROPIC_API_KEY SECRET_KEY)
for var in "${REQUIRED[@]}"; do
  val="${!var:-}"
  if [[ -z "$val" || "$val" == YOUR_* ]]; then
    echo "ERROR: $var is not set in .env"
    exit 1
  fi
done

if [[ "${1:-}" == "--first-time" ]]; then
  echo "==> Creating Fly app (first time)..."
  fly launch --copy-config --name driftguard-api --region fra --no-deploy
fi

echo "==> Setting Fly secrets..."
fly secrets set \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  SECRET_KEY="$SECRET_KEY" \
  GITHUB_APP_ID="$GITHUB_APP_ID" \
  GITHUB_APP_PRIVATE_KEY="$GITHUB_APP_PRIVATE_KEY" \
  GITHUB_WEBHOOK_SECRET="$GITHUB_WEBHOOK_SECRET" \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-haiku-4-5-20251001}" \
  INFRACOST_API_KEY="${INFRACOST_API_KEY:-}" \
  STRIPE_API_KEY="${STRIPE_API_KEY:-}" \
  STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
  RESEND_API_KEY="${RESEND_API_KEY:-}" \
  SENTRY_DSN="${SENTRY_DSN:-}" \
  --stage

echo "==> Deploying..."
fly deploy --dockerfile Dockerfile

echo ""
echo "Done. API live at: https://driftguard-api.fly.dev"
echo "Health: curl https://driftguard-api.fly.dev/api/v1/health"
echo "Docs:   https://driftguard-api.fly.dev/docs"
