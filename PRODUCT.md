# Product

## Register

product

## Users

Three overlapping personas, all technical:

- **Platform / infra engineer** — writes Terraform and K8s, opens PRs, reads security findings inline. High context, high trust in data, low tolerance for noise.
- **DevOps / SRE lead** — monitors incident trends over time, sets org-wide policies, tracks drift across repos. Wants signal density, not individual finding detail.
- **Security / compliance officer** — audits findings against DORA Art.11, NIS2 Art.21, ISO 27001. Policy-oriented; needs traceability and status clarity.

All three share one context: a dark terminal environment, keyboard-first workflows, and zero patience for UI that talks down to them.

## Product Purpose

DriftGuard is a GitHub App that analyses every Terraform, Kubernetes, and GitHub Actions PR for security findings, cost delta, compliance mapping, and infrastructure drift — in under 2 seconds. It posts inline PR comments, blocks merges on critical findings, auto-creates incidents, and surfaces org-wide trends in a dashboard. Success looks like: engineers trust DriftGuard's signal enough to act on it without opening a second tool.

## Brand Personality

Sharp · Fast · Uncompromising

Voice is terse, specific, and confident. No hedging. No marketing register inside the app — labels and copy read like a senior engineer wrote them. Findings are stated as facts, not suggestions. Status is binary where possible.

## Anti-references

**Compliance portal aesthetic**: SOC2 audit tooling — stiff data tables, navy/corporate palette, zero personality, copy written for auditors not engineers. DriftGuard must not look like a checkbox exercise. It is a live operational tool, not a report generator.

Also avoid:
- Grafana/Datadog chart overload (every metric surfaced regardless of relevance)
- SaaS landing clichés inside the product UI (hero-metric cards, gradient text, "Streamline your workflow" copy)

## Design Principles

1. **Signal over ceremony** — every element earns its place by reducing time-to-decision. If it doesn't change what the user does next, cut it.
2. **Trust through precision** — exact severities, exact timestamps, exact file:line references. Approximation erodes trust. The UI never rounds, softens, or hides hard data.
3. **Keyboard-native density** — the interface rewards engineers who never touch the mouse. Density is a feature; whitespace is paid for in value, not given for free.
4. **Dark-native, not dark-mode** — the visual system was designed for dark from the start. Contrast ratios, color roles, and motion are calibrated for low-ambient-light terminal environments, not retrofitted from a light base.
5. **Status is never ambiguous** — every finding, incident, policy, and analysis has one clear state. The UI never shows "loading" for content the user already fetched, or "unknown" for data the system has.

## Accessibility & Inclusion

WCAG 2.1 AA minimum. Specific requirements:
- 4.5:1 contrast ratio for all body text and interactive states
- Keyboard navigation for all dashboard flows (findings, incidents, policies, analyses)
- Screen reader support for status indicators and severity badges (aria-label, not color-only)
- Reduced motion: all animations have `prefers-reduced-motion` alternatives
- i18n: 6 locales (EN, PT-BR, ES, ZH, HI, AR); RTL layout supported for AR
