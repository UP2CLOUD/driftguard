# Driftguard

AI code review for infrastructure. Catches cost, drift, and security issues in Terraform PRs before merge.

> Status: MVP scaffold. Do not deploy to prod.

## What it does

Driftguard is a GitHub App. On every Terraform PR it:

1. Runs `terraform plan` in an isolated sandbox.
2. Computes cost delta (Infracost), state drift, and security misconfig (Checkov).
3. Generates a structured AI review (Claude Sonnet) and posts it as a PR comment.

## Stack

| Layer | Choice |
|---|---|
| API | Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic |
| Worker | Same process (MVP); Temporal later |
| DB | PostgreSQL 16 |
| Cache/queue | Redis 7 |
| LLM | Anthropic Claude Sonnet |
| Web | Next.js 15 + Tailwind |
| Infra | GCP Cloud Run + Cloud SQL, Terraform |
| CI | GitHub Actions |

## Local dev

Requirements: Docker, Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/), pnpm, gh.

One command:

```bash
./bootstrap.sh
```

Or manually:

```bash
cp .env.example .env
docker compose up -d
make api-install
make api-dev      # http://localhost:8000
make web-install
make web-dev      # http://localhost:3000
```

## Deploy to production

See `docs/DEPLOY.md` (end-to-end ~30-60 min: GCP project → bootstrap terraform → secrets → first deploy → GitHub App).

## Repo layout

```
apps/api          FastAPI service (webhook, analyzer, review)
apps/web          Landing page + dashboard
infra/terraform   GCP infra
docs              Architecture and runbooks
```

## Roadmap

See `docs/ROADMAP.md`.

## License

MIT
