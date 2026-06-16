"use client";

import { useT } from "@/components/TranslationProvider";
import { useState } from "react";
import { SectionHeader } from "./Architecture";
import { PricingCta } from "./PricingCta";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

export function Pricing() {
  const t = useT();
  const [annual, setAnnual] = useState(false);

  const PLANS = [
    {
      key: "oss",
      tier: t("landing.pricing.plans.oss.tier"),
      monthlyPrice: null,
      annualPrice: null,
      freeLabel: t("landing.pricing.plans.oss.freeLabel"),
      desc: t("landing.pricing.plans.oss.desc"),
      features: [
        t("landing.pricing.plans.oss.f1"),
        t("landing.pricing.plans.oss.f2"),
        t("landing.pricing.plans.oss.f3"),
        t("landing.pricing.plans.oss.f4"),
      ],
      cta: t("landing.pricing.plans.oss.cta"),
      href: "https://github.com/UP2CLOUD/driftguard",
      external: true,
    },
    {
      key: "team",
      tier: t("landing.pricing.plans.team.tier"),
      monthlyPrice: 29,
      annualPrice: 23,
      desc: t("landing.pricing.plans.team.desc"),
      features: [
        t("landing.pricing.plans.team.f1"),
        t("landing.pricing.plans.team.f2"),
        t("landing.pricing.plans.team.f3"),
        t("landing.pricing.plans.team.f4"),
        t("landing.pricing.plans.team.f5"),
        t("landing.pricing.plans.team.f6"),
      ],
      highlighted: true,
      cta: t("landing.pricing.plans.team.cta"),
      href: getGitHubAppInstallUrl(),
      external: true,
      badge: t("landing.pricing.plans.team.badge"),
    },
    {
      key: "enterprise",
      tier: t("landing.pricing.plans.enterprise.tier"),
      monthlyPrice: null,
      annualPrice: null,
      freeLabel: t("landing.pricing.plans.enterprise.freeLabel"),
      desc: t("landing.pricing.plans.enterprise.desc"),
      features: [
        t("landing.pricing.plans.enterprise.f1"),
        t("landing.pricing.plans.enterprise.f2"),
        t("landing.pricing.plans.enterprise.f3"),
        t("landing.pricing.plans.enterprise.f4"),
        t("landing.pricing.plans.enterprise.f5"),
        t("landing.pricing.plans.enterprise.f6"),
      ],
      cta: t("landing.pricing.plans.enterprise.cta"),
      href: "mailto:sales@driftguard.io",
      external: true,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow={t("landing.pricing.eyebrow")}
          title={t("landing.pricing.sectionTitle")}
          subtitle={t("landing.pricing.sectionSubtitle")}
        />

        {/* Billing toggle */}
        <div className="mt-8 mb-12 flex items-center justify-center gap-4">
          <span
            className={`font-mono text-[12px] uppercase tracking-widest transition ${
              !annual ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-subtle)]"
            }`}
          >
            {t("landing.pricing.billingMonthly")}
          </span>
          <button
            onClick={() => setAnnual((a) => !a)}
            aria-label={t("landing.pricing.toggleAria")}
            className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
              annual
                ? "border-[color:var(--dg-electric)] bg-[color:var(--dg-electric)]/20"
                : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 rounded-full bg-[color:var(--dg-electric)] transition-transform duration-200 ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
              style={{ height: "18px", width: "18px" }}
            />
          </button>
          <span
            className={`font-mono text-[12px] uppercase tracking-widest transition ${
              annual ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-subtle)]"
            }`}
          >
            {t("landing.pricing.billingAnnual")}
            <span className="ml-2 rounded border border-allowed/40 bg-allowed/10 px-1.5 py-0.5 text-[9px] text-allowed">
              {t("landing.pricing.savingsDiscount")}
            </span>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-md border p-6 transition-all ${
                p.highlighted
                  ? "border-[color:var(--dg-electric)]/40 bg-[color:var(--dg-electric)]/5 shadow-[0_0_40px_-10px_rgba(63,140,255,0.15)]"
                  : "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]"
              }`}
            >
              {p.badge && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-b border border-t-0 border-[color:var(--dg-electric)]/40 bg-[color:var(--dg-electric)]/10 px-3 py-0.5 font-sans font-medium text-[9px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
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
                      {t("landing.pricing.perRepoMo")}
                      {annual ? ` ${t("landing.pricing.billedAnnually")}` : ""}
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
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[color:var(--dg-fg-muted)]">
                    <span className="mt-0.5 shrink-0 text-allowed">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <PricingCta
                tier={p.key}
                href={p.href}
                external={p.external}
                label={p.cta}
                className={`dg-button w-full justify-center text-[12px] ${
                  p.highlighted ? "dg-button-primary" : "dg-button-ghost"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-8 text-center font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
          {t("landing.pricing.footer")}
        </p>
      </div>
    </section>
  );
}
