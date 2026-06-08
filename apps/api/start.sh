#!/bin/sh
i=1
while [ $i -le 3 ]; do
    uv run alembic upgrade head && break
    echo "[warn] alembic attempt $i/3 failed"
    i=$((i + 1))
    [ $i -le 3 ] && sleep 5
done
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
