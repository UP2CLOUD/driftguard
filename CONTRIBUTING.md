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
cd apps/api  && uv run pytest -q --ignore=tests/eval && uv run ruff check . && uv run ruff format --check .
cd apps/web  && npx tsc --noEmit && pnpm lint && pnpm validate-i18n && pnpm build
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
or `claude-code-action` on an `@claude`-triggered PR) does **not** by itself
satisfy the required-review check — a human collaborator still has to
approve. Keep this in mind if you're relying on automation to get a PR to
a mergeable state end-to-end.

## Reporting issues

Open a GitHub issue with reproduction steps. For security-sensitive
findings, see `SECURITY.md` if present, or contact the maintainers directly
rather than filing a public issue.

## License

By contributing, you agree your contributions are licensed under the
project's MIT license (see `LICENSE`).
