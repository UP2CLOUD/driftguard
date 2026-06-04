#!/bin/sh
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Migrations complete. Starting server..."
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
