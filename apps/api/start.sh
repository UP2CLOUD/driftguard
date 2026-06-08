#!/bin/sh
set -e
uv run alembic upgrade head
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
