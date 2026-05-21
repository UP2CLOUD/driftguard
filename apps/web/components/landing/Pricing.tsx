"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "./Architecture";

const PLANS = [
  {
    tier: "OSS",
    monthlyPrice: null,
    annualPrice: null,
    freeLabel: "Free forever",
    desc: "Self-host the analyzer. Community policies.",
    features: [
      "Up to 50 PR reviews / mo",
      "1 repo",
      "30-day memory retention",
      "Community support",
    ],
    cta: "Self-host →",
    href: "https://github.com/UP2CLOUD/driftguard",
    external: true,
  },
  {
    tier: "Team",
    monthlyPrice: 29,
    annualPrice: 23,
    desc: "Production PR reviews for human and agent contributors.",
    features: [
      "Unlimited PR analyses",
      "Cost · drift · security · compliance",
      "Semantic memory — 1 year retention",
      "OPA policy bundles",
      "Slack + email alerts",
      "Priority support",
    ],
    highlighted: true,
    cta: "Start free trial →",
    href: "https://github.com/apps/driftguard-app/installations/new",
    external: true,
    badge: "Most popular",
  },
  {
    tier: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    freeLabel: "Custom",
    desc: "Self-hosted, air-gapped, regulated environments.",
    features: [
      "BYO-cloud / on-prem",
      "SSO / SCIM provisioning",
      "Custom policy modules",
      "Dedicated VPC",
      "99.95% SLA",
      "DORA / NIS2 / ISO 27001 evidence",
    ],
    cta: "Contact sales →",
    href: "mailto:sales@driftguard.io",
    external: true,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader eyebrow="Pricing" title="Simple, per-repo pricing" subtitle="Start free. Add repos as you grow. Cancel anytime." />

        {/* Billing toggle */}
        <div className="mt-8 mb-12 flex items-center justify-center gap-4">
          <span className={`font-mono text-[12px] uppercase tracking-widest transition ${!annual ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-subtle)]"}`}>
            Monthly
          </span>
          <button
            onClick={() => setAnnual((a) => !a)}
            aria-label="Toggle billing period"
            className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
              annual
                ? "border-[color:var(--dg-electric)] bg-[color:var(--dg-electric)]/20"
                : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-[color:var(--dg-electric)] transition-transform duration-200 ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
              style={{ height: "18px", width: "18px" }}
            />
          </button>
          <span className={`font-mono text-[12px] uppercase tracking-widest transition ${annual ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-subtle)]"}`}>
            Annual
            <span className="ml-2 rounded border border-allowed/40 bg-allowed/10 px-1.5 py-0.5 text-[9px] text-allowed">
              -20%
            </span>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.tier}
              className={`relative flex flex-col rounded-md border p-6 transition-all ${
                p.highlighted
                  ? "border-[color:var(--dg-electric)]/40 bg-[color:var(--dg-electric)]/5 shadow-[0_0_40px_-10px_rgba(63,140,255,0.15)]"
                  : "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]"
              }`}
            >
              {p.badge && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-b border border-t-0 border-[color:var(--dg-electric)]/40 bg-[color:var(--dg-electric)]/10 px-3 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
                    {p.badge}
                  </span>
                </div>
              )}

              <div className="dg-label mb-2">{p.tier}</div>

              {/* Price */}
              <div className="mb-1 flex items-end gap-1.5">
                {p.monthlyPrice !== null ? (
                  <>
                    <span className="font-sans text-3xl font-bold tabular-nums text-[color:var(--dg-fg)]">
                      €{annual ? p.annualPrice : p.monthlyPrice}
                    </span>
                    <span className="mb-1 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
                      / repo / mo{annual ? " (billed annually)" : ""}
                    </span>
                  </>
                ) : (
                  <span className="font-sans text-3xl font-bold text-[color:var(--dg-fg)]">
                    {p.freeLabel}
                  </span>
                )}
              </div>

              <p className="mb-5 text-[12px] text-[color:var(--dg-fg-muted)]">{p.desc}</p>

              <ul className="mb-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-[color:var(--dg-fg-muted)]">
                    <span className="mt-0.5 shrink-0 text-allowed">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                target={p.external ? "_blank" : undefined}
                rel={p.external ? "noreferrer" : undefined}
                className={`dg-button w-full justify-center text-[12px] ${
                  p.highlighted ? "dg-button-primary" : "dg-button-ghost"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-8 text-center font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
          All plans include SOC 2 Type II (Q4 2026) · GDPR-native · EU data residency
        </p>
      </div>
    </section>
  );
}
