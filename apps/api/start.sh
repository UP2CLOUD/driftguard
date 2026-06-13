#!/bin/sh
# Container entrypoint: apply DB migrations, then start the API server.
# Migrations are idempotent (ADD COLUMN/CREATE INDEX IF NOT EXISTS) so re-runs
# are safe. If migrations cannot be applied we still start the server — the API
# degrades gracefully rather than leaving the service down.

run_migrations() {
    # Prefer the installed alembic console script (present in the runtime image
    # via the copied /usr/local/bin); fall back to `uv run` for local/dev shells.
    alembic upgrade head && return 0
    uv run alembic upgrade head && return 0
    return 1
}

i=1
while [ $i -le 3 ]; do
    run_migrations && break
    echo "[warn] alembic attempt $i/3 failed"
    i=$((i + 1))
    [ $i -le 3 ] && sleep 5
done

exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
