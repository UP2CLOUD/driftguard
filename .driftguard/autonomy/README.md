# Autonomy fleet

A daily-run panel of 9 read-only agents (product, uiux, qa, performance,
reliability, security, codehealth, seo, analytics) that look at the
DriftGuard repo itself and surface findings — gaps, risks, and
opportunities a human maintainer would otherwise have to notice manually.

Orchestrator: `apps/api/driftguard/autonomy/`. Findings/config/memory live
here, in the repo, so they're versioned and reviewable like any other
change.

## What Phase 1 does (this is what's currently wired up)

1. `context.py` builds a bounded, deterministic snapshot of the repo
   (directory tree, README/CLAUDE.md/PRODUCT.md/AGENTS.md, recent commits).
2. `orchestrator.py` runs each enabled role's system prompt
   (`roles.py`) against that snapshot via the existing Claude→OpenAI
   `llm_complete()` router — the same call path `ai/reviewer.py` already
   uses for PR reviews, so it reuses the same `ANTHROPIC_API_KEY` secret
   and cost profile.
3. Findings are deduplicated against `memory.json` (a human can add a
   `dedup_key` to `rejected` to permanently silence something not worth
   fixing), prioritized (`prioritize.py`, severity-ranked, capped per
   role and per run), and written to `findings/<run_id>.json` +
   `runs/<run_id>.json`.
4. `.github/workflows/agents-daily.yml` runs this on a cron, gated on
   `ANTHROPIC_API_KEY` being present (skips cleanly, no failure, no cost,
   if it's not set — same pattern as `eval-suite.yml`), and commits the
   findings files back to the repo as a bot commit.

**Nothing in Phase 1 writes application code or opens a pull request.**
It is read-only against the repo it audits; the only write is the
findings/memory JSON.

## What's deliberately NOT built yet

- **Implementation agent** — taking a prioritized finding and writing an
  actual code change.
- **Validation stage** — running lint/type-check/tests against a
  proposed change before it's shown to a human.
- **PR automation** — opening a pull request from a validated change.
- **Weekly/monthly tiers** — deeper, slower-cadence passes (e.g. a
  cross-repo consistency check, a dependency-freshness sweep).
- **Reviewer-role integration** — DriftGuard's own PR-review agent
  (`ai/reviewer.py`) reviewing autonomy-generated PRs before a human
  does.

Each of those has materially more blast radius than "generate a report" —
they write code and touch the PR queue unattended — and deserve their own
review and their own explicit go-ahead before landing, rather than being
bundled into the read-only foundation.

## Running locally

```bash
cd apps/api
ANTHROPIC_API_KEY=... uv run python -m driftguard.autonomy.cli
```

Writes `.driftguard/autonomy/findings/<date>.json` and
`.driftguard/autonomy/runs/<date>.json` under the repo root.
