# Driftguard

AI code review for OpenTofu / Terraform PRs, with EU compliance evidence baked in.

> Status: MVP scaffold. Pivot in progress (OpenTofu-first, DORA/NIS2 angle). Not for prod.

## What it does

GitHub App. On every OpenTofu/Terraform PR:

1. Runs `tofu plan` (or `terraform plan`) in an isolated sandbox.
2. Parses the plan, computes cost delta (Infracost), security findings (Checkov).
3. Maps findings to EU compliance controls (DORA, NIS2, ISO 27001) when applicable.
4. AI synthesizes a prioritized review (Claude Sonnet) with hard guardrails (no invented numbers).
5. Posts a structured PR comment.

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
