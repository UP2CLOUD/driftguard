#!/bin/sh
uv run alembic upgrade head || echo "[warn] alembic upgrade failed — continuing anyway"
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
