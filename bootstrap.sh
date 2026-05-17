#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

g() { printf '\033[32m%s\033[0m\n' "$*"; }
y() { printf '\033[33m%s\033[0m\n' "$*"; }
r() { printf '\033[31m%s\033[0m\n' "$*"; }

g "→ Checking required tools"
missing=()
for t in git docker uv pnpm node gh; do
  command -v "$t" >/dev/null 2>&1 || missing+=("$t")
done
if [ ${#missing[@]} -gt 0 ]; then
  r "Missing: ${missing[*]}"
  cat <<EOF

Install hints:
  uv     curl -LsSf https://astral.sh/uv/install.sh | sh
  pnpm   npm i -g pnpm
  gh     https://cli.github.com
  node   https://nodejs.org (or nvm)
EOF
  exit 1
fi

g "→ Checking GitHub auth"
if ! gh auth status >/dev/null 2>&1; then
  r "Not authenticated. Run: gh auth login"
  exit 1
fi
echo "   logged in as $(gh api user -q .login)"

g "→ Env files"
[ -f .env ] || cp .env.example .env
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local

g "→ Starting postgres + redis"
docker compose up -d

g "→ Waiting for postgres"
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U driftguard >/dev/null 2>&1 && break
  sleep 1
done

g "→ Installing API deps"
(cd apps/api && uv sync --quiet)

g "→ Running API tests"
(cd apps/api && uv run pytest -q)

g "→ Installing web deps"
(cd apps/web && pnpm install --silent)

g "→ GitHub remote"
if git remote get-url origin >/dev/null 2>&1; then
  echo "   already configured: $(git remote get-url origin)"
else
  read -r -p "Create GitHub repo and push? [Y/n] " ans
  if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then
    read -r -p "Repo name [driftguard]: " name; name=${name:-driftguard}
    read -r -p "Visibility (public/private) [private]: " vis; vis=${vis:-private}
    gh repo create "$name" "--$vis" --source=. --push
  fi
fi

cat <<EOF

$(g '✓ Local environment ready')

Next:
  make api-dev          # http://localhost:8000/docs
  make web-dev          # http://localhost:3000

Production deploy:
  see docs/DEPLOY.md
EOF
