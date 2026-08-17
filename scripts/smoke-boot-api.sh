#!/usr/bin/env bash
# Boot the API with the REAL docker-compose.yml environment and verify it
# serves the same health endpoint the Dockerfile's HEALTHCHECK curls.
#
# Why this exists: the unit suite (1100+ tests) overrides get_db and never
# binds a socket, so it cannot catch a crash that happens at import time or
# during startup. A CORS_ORIGINS value that was valid in compose but invalid
# to pydantic-settings took production down exactly that way -- every test
# passed, and the container still died ~1s after start, before uvicorn ever
# listened. This closes that gap by exercising the actual boot path with the
# actual compose values.
#
# Usage: scripts/smoke-boot-api.sh
# Requires: a reachable Postgres + Redis (see DATABASE_URL/REDIS_URL below),
#           `docker compose` CLI (config parsing only -- no daemon needed).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PORT="${SMOKE_PORT:-8000}"
HEALTH_URL="http://localhost:${PORT}/api/v1/health"

echo "==> Resolving api service environment from docker-compose.yml"
# `docker compose config` resolves ${VAR:-default} interpolation the same way
# a real deploy does, so the values under test are the values that ship --
# not a hand-copied duplicate that can silently drift.
ENV_EXPORTS="$(docker compose config --format json \
  | python3 -c '
import json, shlex, sys
cfg = json.load(sys.stdin)
env = cfg["services"]["api"].get("environment", {})
if isinstance(env, list):
    env = dict(e.split("=", 1) for e in env)
for k, v in env.items():
    if v is None:
        continue
    print(f"export {k}={shlex.quote(str(v))}")
')"
eval "$ENV_EXPORTS"

# Point at services this script can actually reach. Inside compose these are
# container hostnames; here they are whatever the caller provisioned.
export DATABASE_URL="${SMOKE_DATABASE_URL:-postgresql+asyncpg://driftguard:driftguard@localhost:5432/driftguard}"
export REDIS_URL="${SMOKE_REDIS_URL:-redis://localhost:6379/0}"

echo "==> Environment under test:"
echo "$ENV_EXPORTS" | sed 's/^export /    /' | sed 's/=.*SECRET.*/=<redacted>/I'

cd apps/api

echo "==> Applying migrations (mirrors start.sh)"
uv run alembic upgrade head

echo "==> Booting uvicorn"
uv run uvicorn driftguard.main:app --host 0.0.0.0 --port "$PORT" &
API_PID=$!
# shellcheck disable=SC2317  # invoked via trap
cleanup() { kill "$API_PID" 2>/dev/null || true; wait "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> Waiting for ${HEALTH_URL}"
for i in $(seq 1 30); do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "::error::API process exited during startup -- this is the failure mode that took production down"
    wait "$API_PID" || true
    exit 1
  fi
  if curl -fs "$HEALTH_URL" >/dev/null 2>&1; then
    echo "==> Healthy after ${i}s"
    curl -fs "$HEALTH_URL"
    echo
    echo "PASS: API booted with compose defaults and answered its Docker HEALTHCHECK"
    exit 0
  fi
  sleep 1
done

echo "::error::API never became healthy within 30s at ${HEALTH_URL}"
exit 1
