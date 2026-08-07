# Autonomy fleet

A panel of 9 read-only finding agents (product, uiux, qa, performance,
reliability, security, codehealth, seo, analytics) that look at the
DriftGuard repo itself, plus an implementation stage that acts on the
subset of their findings that are safe to act on autonomously.

Orchestrator: `apps/api/driftguard/autonomy/`. Findings/config/memory live
here, in the repo, so they're versioned and reviewable like any other
change.

## Phase 1 — finding generation (read-only)

1. `context.py` builds a bounded, deterministic snapshot of the repo
   (directory tree, README/CLAUDE.md/PRODUCT.md/AGENTS.md, recent commits).
2. `orchestrator.py` runs each enabled role's system prompt
   (`roles.py`) against that snapshot via the existing Claude→OpenAI→Gemini
   `llm_complete()` router — the same call path `ai/reviewer.py` already
   uses for PR reviews, so it reuses the same secrets and cost profile.
3. Findings are deduplicated against `memory.json` (a human can add a
   `dedup_key` to `rejected` to permanently silence something not worth
   fixing — dedup is exact-string-match on role+area+title, which does
   *not* survive normal LLM phrasing variance across runs; the same
   underlying non-issue often needs re-rejecting under a new key each time
   it resurfaces reworded), prioritized (`prioritize.py`, severity-ranked,
   capped per role and per run), and written to `findings/<run_id>.json` +
   `runs/<run_id>.json` — as a workflow artifact (90-day retention), *not*
   committed to the repo. Every other workflow here uses `contents: read`;
   this keeps that convention rather than introducing a bot-commit
   pattern.
4. `.github/workflows/agents-daily.yml` runs this every 6 hours, gated on
   `ANTHROPIC_API_KEY` being present (skips cleanly, no failure, no cost,
   if it's not set — same pattern as `eval-suite.yml`).

**A meaningful fraction of raw findings are stale or simply wrong** —
these agents see a bounded context (directory tree + top-level docs, not
full file contents), so they routinely flag things that are already
handled by code they never read. Confirmed repeatedly this session: two
full triage passes each found roughly 30-40% of findings were
already-handled or factually wrong on inspection. Nothing downstream of
this phase should ever trust a finding's text at face value — see Phase 2.

## Phase 2 — implementation (writes code, opens PRs)

`.github/workflows/agents-implement.yml` runs after each `agents-daily`
run completes. It does **not** trust findings as given — it re-verifies
each one against the real current code first, exactly like the manual
triage process used earlier in this project's history, before touching
anything:

1. Independently re-check the finding against the actual files it
   references. Wrong or already-handled findings are silently skipped.
2. Findings that are real but require a product, infrastructure, or
   architecture decision (cost tradeoffs, anything touching
   `protected_paths` in `config.json`, multiple reasonable designs) are
   **not** implemented — only noted in the job summary for a human.
3. Only findings that are small, mechanical, and have one clearly correct
   fix get implemented — same bar used throughout this project's manual
   triage: "would a wrong guess here be embarrassing or costly? if
   genuinely uncertain, skip."
4. Every fix is verified locally (lint, tests, type-check/build as
   applicable) before a PR is opened. One fix per PR, never bundled.

`.github/workflows/agents-autofix-ci.yml` watches `ci-api`/`ci-web` for
failures on any PR and attempts a fix, pushed directly onto the existing
PR branch (not a parallel PR — every PR here already comes from a trusted
source). Includes a runaway-loop guard: if a branch already has a prior
`driftguard-autofix:`-tagged commit and CI is still red, it stops and
leaves it for a human rather than retrying forever.

`.github/workflows/claude.yml` responds to `@claude` mentions in issue
comments, PR review comments, and PR reviews — the same interactive
capability used manually throughout this project, made available without
needing a live session.

### Auto-merge — the one hard rule

PRs opened by `agents-implement.yml` get GitHub's native auto-merge
enabled (`gh pr merge --auto --squash`) on creation — which does **not**
merge immediately. It only merges once this repo's branch protection
required status checks pass: `ci-api`, `ci-web`, and DriftGuard's own
review bot approval.

**Three prerequisites these workflows cannot set up or verify themselves**
— no tool used to build this had access to read or modify repo/branch
settings or billing:

1. Repo settings → General → Pull Requests → **"Allow auto-merge"** must
   be enabled, or `gh pr merge --auto` fails outright (`gh` reports it
   clearly; the PR just stays open for manual merge in that case, which
   is the same failure mode as prerequisite 2 below).
2. Repo settings → Branches → the default branch's protection rule →
   **required status checks** must include `test` (ci-api), the `ci-web`
   build job, and the DriftGuard check. Without this, `gh pr merge --auto`
   could merge on the first check to go green without waiting for the
   others — verify this is configured correctly before trusting the gate.
3. The `ANTHROPIC_API_KEY` secret's account needs an available credit
   balance. Confirmed the hard way: `agents-implement.yml` failed on
   **every single run** from creation through 2026-08-07 with a $0-cost,
   single-turn `is_error:true` immediately after SDK init — with the
   underlying error text hidden by default, this looked identical to an
   auth or model-access problem for days. Turning on `claude-code-action`'s
   `show_full_output: true` for one run revealed the real error:
   `"error": "billing_error"`, `"result": "Credit balance is too low"`,
   `"api_error_status": 400`. Check
   https://console.anthropic.com/settings/billing for the account behind
   this key before assuming a code-level cause. Critically,
   `agents-daily.yml` succeeding is **not** evidence this key has credit —
   Phase 1 routes through `llm_router.py`'s Gemini-primary chain (see
   `apps/api/driftguard/ai/llm_router.py`), so it only ever touches
   Anthropic on a Gemini failure. The two workflows share a secret name
   but exercise completely different code paths to it.

### What's still deliberately not built

- **Weekly/monthly tiers** — deeper, slower-cadence passes (e.g. a
  cross-repo consistency check, a dependency-freshness sweep).
- **Findings dedup surviving LLM phrasing variance** — noted above; the
  memory system's exact-string matching is a known real gap, not yet
  addressed.

## Running locally

```bash
cd apps/api
ANTHROPIC_API_KEY=... uv run python -m driftguard.autonomy.cli
```

Writes `.driftguard/autonomy/findings/<date>.json` and
`.driftguard/autonomy/runs/<date>.json` under the repo root. This only
exercises Phase 1 (finding generation) — Phase 2 runs exclusively via the
GitHub Actions workflows above, since it needs a real git remote and PR
API access that a local run doesn't have.
