# DriftGuard Agent Notes

This file is intentionally narrow. Only commands and workflows validated from the repository are listed here.

## Local prerequisites

Validated from `README.md`, `bootstrap.sh`, and `DEPLOY.md`:

- Docker and Docker Compose
- Node.js 20+ and `pnpm`
- Python 3.12+ and `uv`
- `gh`
- For production/bootstrap workflows: `gcloud` and `terraform >= 1.9`

## Local setup

Preferred one-shot bootstrap:

```bash
./bootstrap.sh
```

This script validates required tools, checks `gh` auth, copies missing env files, starts `docker compose`, installs API and web dependencies, and runs API tests.

Manual setup path validated in `README.md`:

```bash
cp .env.example .env
docker compose up -d
```

## Common development commands

From the repo `Makefile`:

```bash
make api-install
make api-dev
make api-test
make web-install
make web-dev
make web-build
make fmt
make lint
make migrate
make migration m="add x"
make tf-fmt
make tf-validate
make tf-bootstrap
make bootstrap
```

## Direct package commands

Validated from `README.md` and package manifests:

```bash
cd apps/api
uv sync
uv run uvicorn driftguard.main:app --reload
uv run pytest tests/ -q --ignore=tests/eval
uv run ruff check .
uv run ruff format .
uv run alembic upgrade head
uv run python -m driftguard.db.seed

cd apps/web
pnpm install
pnpm dev
pnpm build
pnpm validate-i18n
npx tsc --noEmit
```

## Deployment and infrastructure

Validated entrypoints:

```bash
./bootstrap.sh
cd infra/terraform/bootstrap && terraform init && terraform apply
```

Production deployment details are documented in `DEPLOY.md`.

## TODO

- Agent-specific review, release, and CI triage workflow is not yet documented here because it was not validated from repo usage in this run.
