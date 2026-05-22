#!/usr/bin/env bash
# DriftGuard GCP bootstrap helper
# Usage: ./scripts/bootstrap_gcp.sh <PROJECT_ID> <BILLING_ACCOUNT_ID>
set -euo pipefail

PROJECT_ID="${1:?Usage: $0 <PROJECT_ID> <BILLING_ID>}"
BILLING_ID="${2:?Usage: $0 <PROJECT_ID> <BILLING_ID>}"
REGION="${REGION:-europe-west1}"
GITHUB_REPO="${GITHUB_REPO:-UP2CLOUD/driftguard}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}▸ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }

info "Creating GCP project: $PROJECT_ID"
if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
  warn "Project $PROJECT_ID already exists — skipping"
else
  gcloud projects create "$PROJECT_ID" --name="DriftGuard"
fi
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ID"
gcloud config set project "$PROJECT_ID"

info "Running Terraform bootstrap (~3 min)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../infra/terraform/bootstrap"
terraform init -input=false
terraform apply -input=false -auto-approve \
  -var="gcp_project=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="github_repo=$GITHUB_REPO"

WIF_PROVIDER=$(terraform output -raw wif_provider 2>/dev/null || echo "")
DEPLOYER_SA=$(terraform output -raw deployer_sa 2>/dev/null || echo "")
AR_URL=$(terraform output -raw artifact_registry_url 2>/dev/null || echo "")

cd "$SCRIPT_DIR/.."
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  info "Setting GitHub Actions secrets"
  [ -n "$WIF_PROVIDER" ] && gh secret set GCP_WIF_PROVIDER --body="$WIF_PROVIDER"
  [ -n "$DEPLOYER_SA"  ] && gh secret set GCP_DEPLOYER_SA  --body="$DEPLOYER_SA"
  gh variable set GCP_PROJECT --body="$PROJECT_ID"
  gh variable set GCP_REGION  --body="$REGION"
fi

info "Done. Next: populate secrets then run:"
echo "  gh workflow run deploy-api.yml -f environment=dev"
echo "  AR URL: $AR_URL"
