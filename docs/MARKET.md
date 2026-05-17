# Market findings (May 2026)

Raw inputs that drove the OpenTofu + EU compliance pivot.

## Direct competitors

| Player | Same wedge? | Funding | Status |
|---|---|---|---|
| **Terracotta AI** (tryterracotta.com) | **Yes — identical** | Seed (Ambush Capital) | SOC 2 Type II, HIPAA, HashiCorp Tech Partner, healthcare/finserv/insurance clients |
| **CodeRabbit** | Adjacent (general AI code review, includes Trivy IaC) | $88M total, $60M Series B @ $550M (Sep 2025) | 2M+ repos, 13M+ PRs, 8000 paying customers |
| **Spacelift** | Orchestration + drift, no AI review | Bem capitalizado | Starter $250-399/mo. Drift detection nativo |
| **Greptile** | AI code review, not infra-specific | YC | $30/dev + $1/review (controverso) |

## Pricing benchmarks

| Product | Free | Paid entry | Enterprise |
|---|---|---|---|
| CodeRabbit | unlimited public + private (rate-limited) | $15-30/dev/mo | from $15k/mo |
| Greptile | trial only | $30/dev/mo (50 reviews) + $1/review overage | custom |
| Cursor BugBot | — | $40/seat/mo | — |
| Spacelift | 2 users | $250-399/mo | custom |
| Infracost | open source | $50/mo | SOC2 II, custom |

## Why the pivot

Original positioning ("AI reviewer for Terraform PRs") = head-on with Terracotta
which has 12-18 months of lead, HashiCorp partnership, SOC 2 II, paying customers
in regulated verticals. Solo founder cannot win that fight in 2026.

Pivot rationale (OpenTofu + EU compliance):

1. **Terracotta is HashiCorp-aligned** (Run Tasks partner). OpenTofu is the
   BSL-refugee community. Different buyer.
2. **DORA mandatory** in EU finserv since Jan 2025. NIS2 transposed 2024-2025.
   AI Act phasing through 2027. Compliance budget exists.
3. **Drata/Vanta are questionnaire-based and US-centric.** Infra-native compliance
   evidence is an unowned wedge.
4. **EU sovereignty signal is real in 2026.** GDPR + data residency + state ownership
   over critical infra are part of every CISO conversation post-Cloud Act.
5. **Solo founder advantages compound:** EU timezone, EU language, GDPR-native by
   default, no need to compete with $60M-funded US incumbents on devtools volume.

## Risks

- **OpenTofu adoption may stall** if HashiCorp/IBM reverses BSL. Probability low but non-zero.
- **Terracotta expands to EU** with compliance angle. Probability medium (12-18mo).
- **GitHub launches native AI infra review.** Probability ~25% in 18mo.
- **Compliance ICP has long sales cycle.** True. Mitigation: lead with cost+sec for
  bottom-up adoption, upsell compliance later.

## ICP refined

- **Wedge ICP:** EU fintech / payment / banking, 50-500 engineers, must comply with DORA,
  uses Terraform/OpenTofu in production, has existing platform team.
- **Buyer:** Head of Platform / Head of Cloud / CISO (compliance budget unlocks the deal).
- **Anti-ICP for now:** US-only orgs, Fortune 500 (cycle too long), <20 engineers.

## Distribution implications

| Channel | Before pivot | After pivot |
|---|---|---|
| GitHub Marketplace | primary | still primary for PLG entry |
| OpenTofu community (Slack, OSS) | absent | **primary** |
| Compliance / FinOps content SEO | low priority | **high priority** ("DORA terraform checklist") |
| EU events (FOSDEM, FrOSCon, DevOpsCon EU) | absent | medium priority |
| Cold outbound | Series A/B SaaS | EU fintech CISO/Head of Platform |
