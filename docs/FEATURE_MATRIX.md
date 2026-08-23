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
| Drift detection vs live state | 🟡 Early access | `integrations/drift.py`, `workers/analyzer.py::_safe_drift` | Needs a cross-account AWS role. Without credentials it degrades to plan-only |
| AI review | ✅ Available | `ai/reviewer.py`, `services/analysis/ai_review.py` | Anthropic primary, Gemini fallback. Falls back to a deterministic static summary when no provider is configured |
| Semantic memory / incident recall | ✅ Available | `api/v1/memory.py`, pgvector migration 002 | Isolated per organisation |
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
| Rate limiting | ✅ Available | `core/rate_limit.py`, `core/ratelimit.py` | ⚠️ Two parallel implementations with separate buckets — see `PRODUCTION_READINESS.md` N-6 |
| CLI (`driftguard-cli`) | ✅ Available | `apps/cli/` | Published to PyPI via Trusted Publishing |
| Multi-language UI | ✅ Available | `apps/web/messages/*.json` | 6 locales, 1751 keys, parity enforced in CI |
| **SSO / SCIM provisioning** | 📋 **Planned** | — | **Nothing in `apps/api` implements SAML, OIDC SSO, or SCIM.** Was listed as an Enterprise plan feature; now labelled |
| Self-hosting | ✅ Available | `docker-compose.yml`, `docs/DEPLOY.md` | |

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
| DORA / NIS2 / ISO 27001 evidence in PR review | ✅ Available | Emitted per analysis |
| **SOC 2 Type II** | 📋 **Planned** | **Audit scheduled Q4 2026 — not held.** The pricing footer said "All plans include SOC 2 Type II"; the Arabic and Hindi strings had dropped even the date qualifier |
| Compliance evidence export pack | 🤝 Contact sales | A `mailto:` request, prepared by hand. Was described as "Available for SOC 2, ISO 27001, DORA, and NIS2", which reads as self-serve |
| Uptime SLA | 🤝 Contact sales | No uptime measurement backs a figure. The advertised "99.95% SLA" has been replaced with "SLA by agreement" |
| Vulnerability disclosure policy | ✅ Available | `SECURITY.md` |

## Known gaps, tracked

| Gap | Status | Where |
|---|---|---|
| GitHub App webhook secret rotation | 🔴 **Open P0** | `docs/SECRET_ROTATION.md` — requires the owner; not closable by code |
| Memory retention enforcement | 📋 Planned | No purge job. Copy corrected to stop claiming windows |
| OPA / Rego policy bundles | 📋 Planned | Custom rule engine ships today |
| SSO / SCIM | 📋 Planned | |
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
