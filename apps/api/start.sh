#!/bin/sh
exec uvicorn driftguard.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
