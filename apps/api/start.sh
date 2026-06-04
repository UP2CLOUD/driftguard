#!/bin/sh
echo "Running database migrations..."
alembic upgrade head || echo "Migration warning (continuing): $?"
echo "Starting server..."
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
