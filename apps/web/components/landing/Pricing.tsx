import { SectionHeader } from "./Architecture";
import Link from "next/link";

const PLANS = [
  {
    tier: "OSS",
    price: "Free",
    desc: "Self-host the analyzer. Community policies.",
    features: ["Up to 50 PR reviews/mo", "1 repo", "30‑day memory retention", "Community support"],
    cta: "Self-host →",
    href: "https://github.com/UP2CLOUD/driftguard",
  },
  {
    tier: "Team",
    price: "€29",
    period: "/repo / month",
    desc: "Production PR reviews for human and agent contributors.",
    features: ["Unlimited PR analyses", "Cost / drift / security / compliance", "Semantic memory (1y retention)", "OPA policy bundles", "Slack alerts", "Priority email support"],
    highlighted: true,
    cta: "Start free trial →",
    href: "/?signin=true",
  },
  {
    tier: "Enterprise",
    price: "Custom",
    desc: "Self-hosted, air-gapped, regulated environments.",
    features: ["BYO‑cloud / on‑prem", "SSO / SCIM", "Custom policy modules", "Dedicated VPC", "99.95% SLA", "DORA / NIS2 / ISO 27001 evidence pack"],
    cta: "Contact sales →",
    href: "mailto:sales@driftguard.io",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Pricing"
          title="Per-repo. Annual saves 15%."
          subtitle="Start free. Pay only for the projects you run in production."
        />

        <div className="mt-16 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.tier}
              className={`relative bg-[color:var(--dg-canvas)] p-6 sm:p-7 ${
                p.highlighted ? "lg:z-10 lg:shadow-[0_0_0_1px_var(--dg-electric)] bg-[color:var(--dg-surface)]" : ""
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-7 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--dg-electric)] bg-[color:var(--dg-canvas)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
                  <span className="h-1 w-1 rounded-full bg-[color:var(--dg-electric)]" />
                  Most popular
                </div>
              )}

              <div className="dg-label">{p.tier}</div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-sans text-4xl font-semibold tracking-tight text-[color:var(--dg-fg)]">{p.price}</span>
                {p.period && <span className="text-[12px] text-[color:var(--dg-fg-subtle)] font-mono">{p.period}</span>}
              </div>
              <p className="mt-3 text-[13px] text-[color:var(--dg-fg-muted)]">{p.desc}</p>

              <ul className="mt-6 space-y-2.5 text-[13px]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[color:var(--dg-fg-muted)]">
                    <span className="mt-1 h-1 w-1 rounded-full bg-[color:var(--dg-electric)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={`mt-8 inline-flex w-full items-center justify-center gap-1 rounded-md px-3.5 py-2.5 font-mono text-[12px] uppercase tracking-widest transition
                  ${p.highlighted
                    ? "bg-[color:var(--dg-electric)] text-white hover:bg-[color:var(--dg-electric-bright)] shadow-[0_0_20px_-4px_var(--dg-electric)]"
                    : "border border-[color:var(--dg-border-strong)] text-[color:var(--dg-fg)] hover:border-[color:var(--dg-border-bright)] hover:bg-[color:var(--dg-surface)]"
                  }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
