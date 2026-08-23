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
make secrets-scan       # gitleaks over the working tree
make secrets-selftest   # prove .gitleaks.toml still catches real secrets
make no-tfstate         # fail if Terraform state or plan artifacts are tracked
```

## Rules that are enforced, not advisory

- **Never commit a credential.** `gitleaks` gates every PR and runs as a
  pre-commit hook. A real webhook secret already reached this public repo once
  through a Markdown file; see `docs/SECRET_ROTATION.md`. If you edit
  `.gitleaks.toml`, run `make secrets-selftest` — a broken allowlist fails
  open, so a green scan proves nothing on its own.
- **Never commit Terraform state or plan binaries.** `sensitive = true` only
  suppresses CLI output; state holds the value in cleartext.
- **Never add a user-visible capability claim without updating
  `docs/FEATURE_MATRIX.md`** in the same PR. Only mark a row Available when it
  names a real file and a real test. Plan limits live in
  `apps/api/driftguard/core/config.py` and are asserted against website copy by
  `apps/web/lib/plan-claims.test.ts`.
- **Debug routes must never be registered in production.** They live on
  `health.debug_router`, which `api/v1/__init__.py` mounts only outside prod.

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

## PR review and CI triage

Validated from repeated real usage across multiple PRs, not aspirational:

**Required checks on the default branch:** `ci-api` (`test`), `ci-web`
(`build`), CodeQL (`Analyze (python)` + `Analyze (javascript-typescript)`),
and an approving human review. A bot-only approval (DriftGuard's own
self-review, or Gemini CLI acting on an `@gemini` mention via
`gemini.yml`) does **not** satisfy the required-review check by itself —
`mergeable_state` stays `"blocked"` until a human collaborator approves,
even with every status check green.

**DriftGuard's own self-review bot** (`driftguard-reviews[bot]`) posts a
summary comment with a risk score and, separately, a review
(approve/request-changes). One known false positive worth recognizing
rather than re-investigating each time: rule `GHA004` ("No permissions:
block defined") has fired on workflow files that *do* define an explicit
job-level `permissions:` block (seen on `claude.yml`, before it was renamed
`gemini.yml` — same structure, so the same false positive likely recurs) —
verified directly against the file, not assumed. Confirm against the
actual workflow before treating a `GHA004` finding as real.

**Non-actionable bot comments to recognize and skip, not investigate:**
- `vercel[bot]` — automated build/deploy status, updates in place per push.
- `gemini-code-assist[bot]` — a fixed sunset notice ("consumer version...
  has been sunset"), not a real review, appears once per PR.

**Transient CI infrastructure failures:** CodeQL (and other GitHub-hosted
Actions) can fail with `Service Unavailable` / `Internal Server Error`
while resolving action download info — a GitHub-side hiccup, not a real
finding against the diff. `rerun_failed_jobs` / `rerun_workflow_run` can
return `403 This workflow run cannot be retried` for some run types
(observed on a CodeQL default-setup run); an empty `git commit --allow-empty`
push is the reliable fallback to retrigger CI in that case.

**Resuming work after a PR merges:** the working branch for ongoing
sessions is reused across PRs. Once a PR on it merges, reset it from the
new default branch tip before starting the next change —
`git checkout -B <branch> origin/main` — rather than stacking new commits
on the now-merged history.

**The 24/7 autonomy fleet** (`agents-daily.yml` → `agents-implement.yml` →
`agents-autofix-ci.yml`, see `.driftguard/autonomy/README.md`) has two
independently moving pieces worth checking separately when asked "is it
working": finding generation (`agents-daily.yml`, Python SDK via
`llm_router.py`, Gemini-primary with Claude/OpenAI fallback) and
implementation (`agents-implement.yml`, `agents-autofix-ci.yml`,
`gemini.yml` — all three now run on the Gemini CLI headless, not
`claude-code-action`) use different code paths and, historically, different
provider auth entirely — one working was never evidence the other did (this
is exactly how `agents-implement.yml`'s 100% failure rate went unnoticed:
`agents-daily.yml` kept succeeding via its Gemini-primary fallback while the
Anthropic-backed implementation step failed silently every run). Check each
workflow's own run history (`list_workflow_runs`), not just whether the
fleet "runs on schedule."
