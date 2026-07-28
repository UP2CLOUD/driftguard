import Link from "next/link";

// Kept in sync with components/landing/Pricing.tsx (the full pricing page).
// This is a lightweight teaser, not a duplicate of the real plan logic.
const PLANS = [
  {
    tier: "OSS",
    price: "Free forever",
    desc: "Self-host the analyzer. Community policies, 1 repo.",
    highlighted: false,
  },
  {
    tier: "Team",
    price: "€29 /repo/mo",
    desc: "Unlimited PR analyses, semantic memory, policy bundles.",
    highlighted: true,
  },
  {
    tier: "Enterprise",
    price: "Custom",
    desc: "Self-hosted, air-gapped, SSO/SCIM, dedicated SLA.",
    highlighted: false,
  },
];

export function PricingTeaser() {
  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Pricing
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Start free, scale with your fleet</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl mx-auto">
          Every plan includes cost, security, drift, and compliance checks on every pull request.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`flex flex-col rounded-lg border p-6 ${
              plan.highlighted
                ? "border-[color-mix(in_srgb,var(--dg-electric)_50%,transparent)] bg-[color-mix(in_srgb,var(--dg-electric)_6%,transparent)]"
                : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]"
            }`}
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-2">
              {plan.tier}
            </div>
            <div className="text-2xl font-medium text-white mb-3">{plan.price}</div>
            <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">{plan.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] hover:text-white transition-colors"
        >
          See full pricing &amp; feature comparison →
        </Link>
      </div>
    </div>
  );
}
