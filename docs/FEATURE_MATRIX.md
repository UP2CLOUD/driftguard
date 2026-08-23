# DriftGuard — Feature Matrix

**Last verified:** 2026-08-23 against `main`.

This is the single source of truth for what DriftGuard can actually do. Every
row was checked against the code, not against another document. If a claim
appears on the website, in the README, or in a sales conversation and does not
appear here as **Available**, it is not shipped.

## Status vocabulary

| Status | Means |
|---|---|
| ✅ **Available** | Implemented, covered by an automated test, documented. Safe to advertise. |
| 🟡 **Early access** | Implemented and usable, but with a caveat named in the Notes column. Advertise only with that caveat attached. |
| 📋 **Planned** | Not implemented. Must be labelled "planned" or "roadmap" wherever it is mentioned. Never listed as a plan feature without that label. |
| 🤝 **Contact sales** | Delivered by people, not by the product. Honest to offer; dishonest to imply it is self-serve. |

---

## Analysis engines

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Terraform / OpenTofu static scan | ✅ Available | `services/scanner/rules/terraform.py`, `tests/test_scanner*.py` | TF001–TF0xx: IAM wildcards, public ACLs, open SGs, `force_destroy`, missing encryption |
| Kubernetes manifest scan | ✅ Available | `services/scanner/rules/kubernetes.py` | Privileged containers, host mounts |
| GitHub Actions workflow scan | ✅ Available | `services/scanner/rules/github_actions.py` | Unpinned action refs |
| Terraform plan parsing | ✅ Available | `services/terraform/plan_parser.py`, `tests/test_plan_parser.py` | Handles modules, replace paths, sensitive masks |
| Risk scoring | ✅ Available | `services/terraform/risk_scorer.py` | Deterministic 0–100. **46** resource weights + **12** provider weights — the README previously said 70 |
| Cost delta (Infracost) | 🟡 Early access | `ai/findings.py::from_infracost` | Requires an Infracost API key. Without one, no cost findings are produced — the analysis does not fail, it is simply silent on cost |
| Security scan (Checkov) | ✅ Available | `ai/findings.py::from_checkov` | Only `check_name`/`guideline` are carried through; `code_block` is deliberately dropped so source values never reach a PR comment |
| Drift detection vs live state | 🟡 Early access | `integrations/drift.py`, `workers/analyzer.py::_fetch_real_state` | Needs a cross-account AWS role. Without credentials it degrades to plan-only. **Terminology flag, not fixed here:** `_fetch_real_state` fetches the Terraform state file from the customer's S3 backend via STS — it never calls a live AWS describe-* API. That means a resource manually deleted or changed outside Terraform, with no `apply`/`refresh` since, would not be caught: the comparison is plan-vs-state-file, not plan-vs-actual-cloud-resources. `/docs/drift`'s technical copy had this exact self-contradiction (one paragraph correctly said "S3 state backend," the next said "real state in your cloud account" / "live state") and has been corrected to "your Terraform state file" consistently. The same "live state" / "live drift detection" phrasing is used more loosely as a product-name-style term across marketing copy (landing page, `/security`, onboarding docs) — left untouched here because a sweeping rename of established product language is a positioning call, not a narrow factual fix, and this session is auto-merging PRs within minutes with no visible human review gate. Flagging for the owner's call rather than executing it unilaterally |
| AI review | 🟡 Early access | `ai/reviewer.py`, `services/analysis/ai_review.py`, `services/ai_health.py` | Anthropic primary, Gemini fallback, deterministic static summary if both are unreachable. **As of 2026-08-23 both configured providers are exhausted** — `gemini.yml`'s own header notes ANTHROPIC_API_KEY hit a billing error, and the daily `eval-suite` cron has failed every run since 2026-08-01 on a Gemini `429 RESOURCE_EXHAUSTED: monthly spending cap`. The fallback chain is working as designed; there is currently nothing left to fall back *to*. Live PR reviews right now most likely return the static summary, not an AI-generated one. Requires the owner to raise the Gemini spend cap or fund/rotate ANTHROPIC_API_KEY — not fixable by a code change. **This is no longer silent**: every real attempt now records which tier answered, `/api/v1/ready` surfaces it as `ai_review: "error: falling back to static summary — …"`, and the public `/status` page shows it as a distinct row rather than the "Security" row it was previously (and incorrectly) mapped to |
| Semantic memory / incident recall | 🟡 Early access | `api/v1/memory.py`, `services/embeddings.py`, `services/embedding_health.py`, pgvector migration 002 | Isolated per organisation. **Was silently non-functional in every deployment, not just unconfigured ones**: `_voyage_embed` authenticated against `api.voyageai.com` (a separate provider from Anthropic, its own key format) using `settings.anthropic_api_key`. That call always fails auth, and the `try/except` around it fell back to `_dev_embed` — an explicitly non-semantic, hash-based pseudo-embedding, per its own docstring — with only a `log.warning`. Every stored "incident embedding" and every "similar past incident" match was running on that fallback, unconditionally, regardless of whether `ANTHROPIC_API_KEY` was set. Fixed: added a real `VOYAGE_API_KEY` setting, corrected the auth header, and added `embedding_health.py` (mirrors `ai_health.py`) so `/api/v1/ready` → `checks.embeddings` and the `/status` Memory row now reflect whether recall is actually semantic — previously that row read `checks.db`, which stayed "ok" through the entire failure because Postgres itself was never the problem |
| Compliance control mapping | ✅ Available | `compliance/mappings.py` | DORA Art.11, NIS2 Art.21, ISO 27001 A.8.8 mapped per finding |

## Platform

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| GitHub App PR review | ✅ Available | `api/v1/webhooks.py`, `workers/analyzer.py` | Inline comments + summary comment, deduplicated on re-run |
| Merge gating on critical findings | ✅ Available | `services/policy_engine.py` | `block` / `warn` / `alert` rule types |
| Policy rules | ✅ Available | `services/policy_engine.py`, `api/v1/policies.py` | Custom rule engine |
| **OPA / Rego policy bundles** | 📋 **Planned** | — | **No Rego evaluator exists in `apps/api`.** The pricing page listed "OPA policy bundles" as a Team feature; corrected |
| Audit log | ✅ Available | `services/audit.py`, migration 001 | Records actor, action, target. Never records plan or state contents |
| Webhooks (outbound) | ✅ Available | `api/v1/webhooks.py` | HMAC-SHA256 signed |
| Slack notifications | ✅ Available | `services/slack.py` | |
| Email notifications | ✅ Available | `services/email.py` | Requires `RESEND_API_KEY` |
| REST API + API keys | ✅ Available | `api/v1/tokens.py`, `core/auth.py` | Keys stored as hashes |
| Billing (Stripe subscriptions) | ✅ Available | `services/billing.py`, `api/v1/billing.py`, `api/v1/stripe_webhooks.py` | Checkout Sessions with `automatic_tax`, idempotent webhook processing. A `past_due` subscription keeps `is_premium()` access during payment retry, but `org.plan` resets to `"free"` for display — the settings page now surfaces the real state via `subscription_status` instead of silently showing "Free plan" (`PRODUCTION_READINESS.md` N-9) |
| Rate limiting | ✅ Available | `core/rate_limit.py`, `core/ratelimit.py` | ⚠️ Two parallel implementations with separate buckets — see `PRODUCTION_READINESS.md` N-6 |
| CLI (`driftguard-cli`) | ✅ Available | `apps/cli/` | Published to PyPI via Trusted Publishing |
| Multi-language UI | ✅ Available | `apps/web/messages/*.json` | 6 locales, 1751 keys, parity enforced in CI |
| **SSO / SCIM provisioning** | 📋 **Planned** | — | **Nothing in `apps/api` implements SAML, OIDC SSO, or SCIM.** Was listed as an Enterprise plan feature; now labelled |
| Self-hosting | ✅ Available | `docker-compose.yml`, `docs/DEPLOY.md` | |
| Public status page | 🟡 Early access | `apps/web/app/status/page.tsx`, `apps/web/lib/status-page.ts` | Reflects the current `/api/v1/ready` snapshot only — every row is backed by a real check, an unreachable backend renders as "unknown" rather than "operational", and a fabricated 90-day uptime chart (it replayed the *current* check across all 90 bars) was replaced with an honest note. Historical uptime tracking does not exist — no `status_history` table, no snapshot job — so this stays Early access, not Available, until that's built |

## Plans and limits

Numbers come from `apps/api/driftguard/core/config.py` and are enforced in
`services/quota.py`. `apps/web/lib/plan-claims.test.ts` fails the build if the
website copy stops matching them.

| Limit | Value | Where enforced |
|---|---|---|
| Free plan repositories | **3** | `free_repository_limit`, `quota.py` |
| Free plan PR reviews | **not metered** | `try_consume_pr_quota` returns `True` for non-premium orgs |
| Free plan manual scans | **20 / month** | `free_monthly_scan_limit` |
| Team (premium) PR analyses | **50 / month** | `premium_monthly_pr_limit`, gated in `workers/analyzer.py` |
| Memory retention window | **not enforced** | No purge job exists. See below |

> **Corrected claim.** The Team plan was advertised as "Unlimited PR analyses"
> while premium orgs were capped at 50/month and received a
> "Monthly PR review limit reached" comment on the pull request. The upgrade
> nudge offered "unlimited PR reviews" as a *reason to upgrade* — free orgs are
> the ones with unmetered reviews; upgrading is what introduces the cap.

> **Retention.** The site advertised 30-day, 365-day, and "unlimited"
> retention windows per plan. **No job deletes anything**, so none of these
> were enforced. The numbers have been removed from the copy rather than a
> data-deletion job being written in a sweep — deleting customer data is not a
> change to make without an explicit decision from the owner. Tracked as
> Planned below.

## Compliance and trust

| Item | Status | Notes |
|---|---|---|
| GDPR-aligned data handling | ✅ Available | Privacy policy, DPA, subprocessor list published |
| EU data residency | ✅ Available | |
| DORA / NIS2 / ISO 27001 evidence in PR review | ✅ Available | `compliance/controls.py::CATALOG` maps ~200 Checkov rule IDs to real article/clause citations (DORA `Art.9`/`Art.10`/`Art.12`/`Art.16`; NIS2 `Art.21(2)(...)`; ISO27001 `A.8.x`/`A.5.x`), cited in the PR's AI review "Compliance notes". **Only covers Checkov-sourced findings** — DriftGuard's own native scanner rules (TF00x, K8S00x, GHA00x) are not in this lookup table and carry no compliance citation. Not fixed here; recorded as a gap below |
| Audit log — cryptographic signing / hash chain | 📋 **Was advertised, never built** | **`db/models.py::AuditLog` has no `seq`, `prev_hash`, or `hash` column, and no hash-chaining logic exists anywhere in `apps/api`.** `/docs/audit`, `/docs/dora`, `/docs/nis2`, `/docs/iso-27001`, the dashboard audit-log page, and the `/security` page all described the log as "signed" and/or "tamper-evident" with hash-chained records — none of that is real. Corrected everywhere; see `PRODUCTION_READINESS.md` N-10. (The `/evidence` interactive demo on the landing page was already honest about this — it explicitly discloses it hashes a synthetic client-side dataset and that DriftGuard doesn't claim real signing.) |
| Audit log CSV export | ✅ Available | `apps/web/app/api/audit-log/route.ts` — capped at the 500 most recent records per download, no offset param. `/docs/audit` previously claimed there was no export at all in one draft of this fix; corrected to describe the real (capped) capability |
| `.github/driftguard.yml` compliance config | 📋 **Was advertised, never built** | Four separate docs pages showed a config file (`compliance.frameworks`, `compliance.evidence.emit/retention_days/export`, and on `/docs/nis2` a fictional `policy.block: [...]` YAML DSL) that is parsed nowhere in `apps/api` — grepped, zero YAML config parsing beyond Kubernetes manifest globbing. All compliance recording is unconditional and automatic; there was never anything to enable. Removed from all four pages |
| **SOC 2 Type II** | 📋 **Planned** | **Audit scheduled Q4 2026 — not held.** The pricing footer said "All plans include SOC 2 Type II"; the Arabic and Hindi strings had dropped even the date qualifier |
| Compliance evidence export pack | 🤝 Contact sales | A `mailto:` request, prepared by hand. Was described as "Available for SOC 2, ISO 27001, DORA, and NIS2", which reads as self-serve |
| Uptime SLA | 🤝 Contact sales | No uptime measurement backs a figure. The advertised "99.95% SLA" has been replaced with "SLA by agreement" |
| Vulnerability disclosure policy | ✅ Available | `SECURITY.md` |

## Known gaps, tracked

| Gap | Status | Where |
|---|---|---|
| GitHub App webhook secret rotation | 🔴 **Open P0** | `docs/SECRET_ROTATION.md` — requires the owner; not closable by code |
| Both LLM providers exhausted (Anthropic billing error, Gemini spend cap) | 🔴 **Open** | AI review row above — live PR reviews likely degrade to the static summary right now; requires the owner's billing action. As of this fix, `/status` will now actually show this as degraded instead of staying silent |
| Memory retention enforcement | 📋 Planned | No purge job. Copy corrected to stop claiming windows |
| OPA / Rego policy bundles | 📋 Planned | Custom rule engine ships today |
| SSO / SCIM | 📋 Planned | |
| Historical uptime tracking | 📋 Planned | `/status` shows current state only. No `status_history` table or snapshot job exists anywhere in the migration chain (`apps/api/driftguard/db/migrations/versions/`) |
| Duplicate rate-limit implementations | ⚠️ Known | `PRODUCTION_READINESS.md` N-6 — left unfixed deliberately; unifying touches the webhook path |
| Terraform ↔ runtime reconciliation | 🟡 Partial | `docs/INFRA_RECONCILIATION.md` |

## Claims we deliberately do not make

- **No latency figures.** "Under 2 seconds" and "sub-10ms semantic recall" were
  advertised with no benchmark in the repository to support them. The ordering
  property is real and is what the copy says now: the gate runs before the
  merge button becomes available.
- **No adoption metrics.** No customer counts, no "trusted by", no logos. The
  `/customers` page carries illustrative scenarios, explicitly labelled as not
  being testimonials.
- **No "guarantees".** The landing page said "measurable guarantees"; there is
  no SLA behind that word. It now says "measured".

---

## How to keep this honest

1. `apps/web/lib/plan-claims.test.ts` reads the quota out of `config.py` and
   fails if any locale's pricing copy disagrees. Raising a limit breaks the
   build until the copy is updated.
2. Adding a row here as ✅ Available requires the evidence column to name a
   real file and a real test.
3. When a capability moves from 📋 Planned to ✅ Available, update this file in
   the same pull request as the implementation — not afterwards.
