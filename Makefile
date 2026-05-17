.PHONY: help api-install api-dev api-test web-install web-dev web-build fmt lint migrate migration tf-fmt tf-validate

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

api-install: ## install api deps
	cd apps/api && uv sync

api-dev: ## run api locally with reload
	cd apps/api && uv run uvicorn driftguard.main:app --reload --port 8000

api-test: ## run api tests
	cd apps/api && uv run pytest -v

web-install: ## install web deps
	cd apps/web && pnpm install

web-dev: ## run web locally
	cd apps/web && pnpm dev

web-build: ## build web for prod
	cd apps/web && pnpm build

fmt: ## format all code
	cd apps/api && uv run ruff format .
	cd apps/web && pnpm format

lint: ## lint all code
	cd apps/api && uv run ruff check .
	cd apps/web && pnpm lint

migrate: ## apply db migrations
	cd apps/api && uv run alembic upgrade head

migration: ## create a new migration. usage: make migration m="add x"
	cd apps/api && uv run alembic revision --autogenerate -m "$(m)"

tf-fmt:
	cd infra/terraform && terraform fmt -recursive

tf-validate:
	cd infra/terraform/envs/dev && terraform init -backend=false && terraform validate
