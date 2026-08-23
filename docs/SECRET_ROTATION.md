# Credential Rotation — Open P0

**Status: OPEN.** This item stays open until the repository owner confirms
rotation. Code changes cannot close it.

This document deliberately does not reproduce any secret value. It identifies
*which* credential is affected and *where* it was reachable, so that rotation
can be performed and verified without re-publishing the material.

---

## Finding

| | |
|---|---|
| **Credential** | GitHub App webhook secret (`GITHUB_WEBHOOK_SECRET`) for the DriftGuard GitHub App |
| **Where** | `DEPLOY.md`, in the `gcloud secrets` setup block |
| **Introduced** | commit `1fa6914` ("fix: missing auth guards, improved error observability, and test coverage", PR #32), 2026-06-11 |
| **Removed from working tree** | 2026-08-23, this branch |
| **Still reachable in git history** | **Yes** |
| **Repository visibility at time of exposure** | Public (`UP2CLOUD/driftguard`) |
| **Forks at time of triage** | 0 |
| **Format** | 64-character hexadecimal, the shape `openssl rand -hex 32` produces — i.e. a full-strength value, not a truncated or example one |

The value was a literal, not a placeholder. Every other secret in the same
block (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, the Anthropic/OpenAI/Resend
/Sentry/PostHog keys, the App private key) was written as an ellipsis
placeholder or a shell substitution, which is why this one was not obvious on
review.

The GitHub App ID in the same block (`3758793`) is **not** a secret. App IDs
are public identifiers, exposed in every webhook delivery and in the App's
public page. It requires no action.

---

## Impact

The webhook secret is the HMAC key GitHub uses to sign webhook deliveries, and
the key DriftGuard uses to verify that an inbound webhook actually came from
GitHub. Anyone holding it can **forge webhook deliveries that DriftGuard will
accept as authentic** — synthesising pull request, push, and installation
events for any repository the App is installed on, and thereby driving scan
runs, incident creation, and PR comments.

It does **not** grant the ability to read repository contents or act as the
App; that requires the App private key, which was never committed.

There is no evidence of exploitation. There is also no way to prove absence:
the repository is public, so the blob has been retrievable by anyone,
including by automated scrapers that index public commits within minutes of a
push. **Treat the credential as compromised.**

---

## Required action (repository owner)

Removing the value from the working tree does not invalidate it. GitHub will
keep accepting the old secret until it is changed in the App settings.

1. **Rotate the webhook secret.**
   GitHub → Settings → Developer settings → GitHub Apps → DriftGuard →
   *Webhook secret* → generate a new value and save.
   Generate it with `openssl rand -hex 32`; do not reuse the old value.

2. **Update the deployment secret**, without echoing the value into shell
   history or CI logs:
   ```bash
   printf '%s' "$NEW_SECRET" | gcloud secrets versions add driftguard-gh-webhook-secret --data-file=-
   ```
   Then redeploy the API so the new version is picked up.

3. **Verify the new secret is in force.** Redeliver a recent webhook from the
   App's *Advanced* tab and confirm a `2xx`. Then send a request to
   `/api/v1/webhooks/github` signed with an arbitrary key and confirm it is
   rejected with `401`.

4. **Review the App's webhook delivery log** for the exposure window
   (2026-06-11 → rotation date) for deliveries the App did not originate.

5. **Confirm here.** Replace the status line at the top of this file with the
   rotation date and the person who performed it, and close the tracking issue.

---

## Why the history was not rewritten

Rewriting shared history would require a force-push to `main` and a coordinated
re-clone by every consumer of the repository. That is an owner decision with
real blast radius, and it is explicitly out of scope for an automated change.

It is also, on its own, **not a remediation**. GitHub retains unreachable
objects and continues to serve them by SHA; a rewrite does not retract what has
already been scraped. Rotation is the remediation. History rewriting is
optional tidying that only makes sense *after* rotation, and only if the owner
accepts the disruption.

---

## Controls added so this class of defect cannot recur silently

| Control | Location | What it stops |
|---|---|---|
| `gitleaks` on every PR, over the working tree | `.github/workflows/security-secrets.yml` (`scan-diff`) | A credential entering the tree in any file type, Markdown included |
| Same rule set as a pre-commit hook | `.pre-commit-config.yaml` | The same commit, before it is ever pushed |
| Scheduled full-history scan, report-only | `.github/workflows/security-secrets.yml` (`scan-history`) | Detecting a *new* historical hit without failing every PR on the known one |
| Terraform state/plan artifacts rejected | `scripts/check-no-tfstate.sh` | Committed state, which is a credential dump regardless of `sensitive = true` |
| Rule tuned to secret-shaped *assignments*, not bare hashes | `.gitleaks.toml` | Alert fatigue — a scanner that flags every SHA-256 digest gets ignored |

The pre-existing `detect-private-key` hook was not sufficient: it only matches
PEM headers, so a hex webhook secret in a Markdown file passed it cleanly.

---

## Scan result at time of writing

A full-tree scan for twelve credential patterns found no remaining live
material. Every surviving high-entropy match is accounted for:

| Class | Count | Disposition |
|---|---|---|
| 64-hex in `uv.lock`, `pnpm-lock.yaml`, `skills-lock.json`, `*.tsbuildinfo` | 4 474 | Dependency integrity digests and build cache. Not credentials. |
| 64-hex in `apps/web/lib/demo/evidence.ts` | 1 | `GENESIS_HASH` — a demo audit-chain digest. Not a credential. |
| `-----BEGIN … PRIVATE KEY-----` in `apps/web/app/docs/env/page.tsx` | 1 | Documentation table showing the expected *shape* of `GITHUB_APP_PRIVATE_KEY`. Header only, no key body. |
| `-----BEGIN … PRIVATE KEY-----` in `apps/api/tests/test_health.py` | 1 | Test fixture asserting config handling. Header string only, no key body. |
