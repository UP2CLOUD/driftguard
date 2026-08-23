# Security Policy

DriftGuard reads infrastructure-as-code and cloud state on behalf of the people
who install it. That makes credential handling the single most important
property of this codebase, and it is the area where we most want to hear from
you.

## Reporting a vulnerability

**Email:** security@driftguard.io

Please include:

- what you did, in enough detail that we can reproduce it;
- what you expected to happen and what happened instead;
- the impact you believe it has.

Do **not** open a public GitHub issue for a security report, and do not include
live credentials in the report — a redacted excerpt is enough for us to act on.

**What to expect:**

| Stage | Target |
|---|---|
| Acknowledgement of your report | 3 business days |
| Initial assessment (severity, whether we can reproduce) | 10 business days |
| Fix or documented mitigation for a confirmed high/critical issue | 30 days |

We will tell you when the fix ships and we will credit you in the release notes
unless you ask us not to. We do not currently run a paid bounty programme.

## Supported versions

DriftGuard is pre-1.0. Only the latest release on `main` receives security
fixes; there are no maintained backport branches.

| Version | Supported |
|---|---|
| `main` (latest release) | Yes |
| Anything older | No — upgrade |

## Scope

In scope: the API (`apps/api`), the web app (`apps/web`), the CLI
(`apps/cli`), the GitHub App integration, and the Terraform modules under
`infra/`.

Out of scope: findings against third-party services we integrate with (report
those to the vendor), volumetric denial of service, and reports produced solely
by an automated scanner with no demonstrated impact.

## How this project handles secrets

These are enforced properties, not aspirations. Each has a gate behind it.

**Nothing that looks like a credential may enter the tree.**
`gitleaks` runs on every pull request over the working tree
(`.github/workflows/security-secrets.yml`) using `.gitleaks.toml`, and the same
rule set runs as a pre-commit hook so a bad commit fails locally first. The
allowlist is limited to dependency lockfiles, generated build caches, and
placeholders that are obviously fake.

**Terraform state and plan binaries are prohibited outright.**
`scripts/check-no-tfstate.sh` fails CI if any `*.tfstate`, `*.tfstate.*`,
`*.tfplan`, or `.terraform/` path is tracked by git. This is a path-only check —
it never reads the contents of a state file, because the check itself runs in
public CI logs. `sensitive = true` in a Terraform configuration suppresses CLI
output only; the value is still written to state in cleartext, so state is
treated as a credential dump by default.

**Plan output is redacted before it leaves the process.**
Terraform plans are parsed for resource-level change metadata. Attribute values
are not forwarded to model providers, are not written to structured logs, are
not included in pull request comments, and are not stored in the audit log.
This is covered by tests in `apps/api/tests/test_plan_redaction.py`.

**Debug endpoints do not exist in production.**
The `/debug/*` routes are not registered when `ENVIRONMENT=prod`. They are
absent from the route table and from the OpenAPI schema, not merely gated
behind a token — a route that exists is a route that can be reached.

**Secrets never appear in logs or error responses.**
Structured logging is field-based; request bodies are not logged. In
production, unhandled exceptions return a generic message and a correlation ID
rather than a stack trace.

## Known unresolved item

A GitHub App webhook secret was committed to `DEPLOY.md` in a public
repository and remained in the tree until it was removed. It is out of the
working tree now, but **it remains reachable in the repository's git history**,
which cannot be rewritten without coordinated force-pushes across every clone
and fork.

**That credential must be rotated by the repository owner. Removing it from the
tree does not invalidate it.** See [`docs/SECRET_ROTATION.md`](docs/SECRET_ROTATION.md)
for what to rotate and how to verify. This item is not considered closed until
the owner confirms rotation.
