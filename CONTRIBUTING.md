# Contributing to DriftGuard

## Before you start

Check `PRODUCT.md` and `DESIGN.md` for the product's scope, brand voice, and
design principles before making UI or copy changes — they're short and
answer most "should this look/read like X" questions.

## Local setup

```bash
git clone https://github.com/UP2CLOUD/driftguard.git
cd driftguard
./bootstrap.sh
```

`bootstrap.sh` validates required tools, checks `gh` auth, copies missing
env files, starts `docker compose`, installs API and web dependencies, and
runs the API test suite. See `README.md` for the manual setup path and
minimum required environment variables if you'd rather not run it.

## Before opening a PR

```bash
cd apps/api  && uv run pytest -q --ignore=tests/eval && uv run ruff check . && uv run ruff format --check . && uv run mypy driftguard
cd apps/web  && npx tsc --noEmit && pnpm lint && pnpm validate-i18n && pnpm test && pnpm build
make secrets-scan && make no-tfstate
```

(`make lint`, `make api-test`, `make web-build` run the equivalent
Makefile targets — see `make help` for the full list.)

CI (`ci-api.yml`, `ci-web.yml`) runs the same checks, plus CodeQL
(Python + JS/TS) and DriftGuard's own self-review bot on every PR — expect
all of them to pass before merge, not just the ones you ran locally.

## Making changes

- One logical change per PR. Don't bundle an unrelated fix or refactor into
  a feature PR — it makes review and revert harder for no benefit.
- Match the smallest correct diff. This codebase deliberately avoids
  premature abstraction (see the repo's own agent guidelines in `CLAUDE.md`)
  — three similar lines beat a shared helper written for a single caller.
- If you touch anything in `apps/web/messages/`, run `pnpm validate-i18n`
  before opening the PR — it enforces key parity across all 6 locales
  (EN, PT-BR, ES, ZH, HI, AR) and CI will reject a mismatch.
- If you touch anything under `apps/api/driftguard/services/scanner/rules/`,
  add or update the corresponding fixture in `tests/` — the scanner rule
  tables in `README.md` are generated from what's actually implemented and
  tested, not aspirational.

## Commit messages and PRs

Follow the existing history's style: imperative mood, `type(scope): summary`
where a scope is obvious (`fix(types): ...`, `feat(web): ...`), and a body
explaining *why* when the diff itself doesn't make that obvious.

PRs use the template in `.github/pull_request_template.md` — What / Why /
How to test / Checklist. Fill in "How to test" with commands a reviewer can
actually run, not just "tests pass."

## Branch protection

The default branch requires: CI (`ci-api`, `ci-web`), CodeQL, and an
approving review before merge. A bot approval (DriftGuard's own self-review,
or Gemini CLI on an `@gemini`-triggered PR via `gemini.yml`) does **not**
by itself satisfy the required-review check — a human collaborator still
has to approve. Keep this in mind if you're relying on automation to get a
PR to a mergeable state end-to-end.

## Secrets and Terraform state

Two rules, both enforced rather than trusted:

**No credential may enter the tree.** `gitleaks` runs on every pull request and
as a pre-commit hook, configured by `.gitleaks.toml`. Install the hooks with
`pre-commit install` so you find out locally instead of in CI. If you need a
placeholder in docs or `.env.example`, make it obviously fake —
`<YOUR_TOKEN_HERE>` — and never a real value you have since rotated.

If you change `.gitleaks.toml`, run `make secrets-selftest`. A misconfigured
allowlist fails *open*: gitleaks still exits 0 and the gate quietly becomes
decoration. The self-test proves it still catches real credentials.

**No Terraform state or plan binaries, ever.** `make no-tfstate` fails if any
`*.tfstate`, `*.tfstate.*`, `*.tfplan` or `.terraform/` path is tracked.
`sensitive = true` suppresses CLI output only — the value is still written to
state in cleartext — so treat state as a credential dump.

## Claims about what the product does

If your change adds, removes, or limits a user-visible capability, update
[`docs/FEATURE_MATRIX.md`](docs/FEATURE_MATRIX.md) in the *same* pull request.
A row may only be marked Available when it names a real file and a real test.

Plan limits are enforced in `apps/api/driftguard/core/config.py` and asserted
against the website copy by `apps/web/lib/plan-claims.test.ts`. Changing a
quota will fail that test until the pricing copy is updated in all six
locales — that is intentional, not an obstacle to route around.

## Reporting issues

Open a GitHub issue with reproduction steps. For security-sensitive findings,
follow [`SECURITY.md`](SECURITY.md) — email security@driftguard.io rather than
filing a public issue.

## License

By contributing, you agree your contributions are licensed under the
project's MIT license (see `LICENSE`).
