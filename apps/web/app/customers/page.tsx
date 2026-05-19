import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Customers — DriftGuard" };

const QUOTES = [
  {
    quote: "Before DriftGuard, our agents were writing Terraform that would silently delete production RDS clusters. Now every PR gets a review in under two seconds and citations to past incidents.",
    author: "Platform Engineering Lead",
    company: "Series B fintech, EU",
    tags: ["AWS", "AI agents", "DORA"],
  },
  {
    quote: "The compliance evidence alone saved us three weeks of audit prep. NIS2 controls are now a side effect of our normal deploy process.",
    author: "Head of Security",
    company: "SaaS infrastructure provider, DE",
    tags: ["NIS2", "ISO 27001", "Compliance"],
  },
  {
    quote: "We tried Infracost alone but the noise was too high. DriftGuard's AI triage means we only see findings that actually matter.",
    author: "Staff Engineer",
    company: "E-commerce platform, PT",
    tags: ["Cost", "Security", "Terraform"],
  },
];

export default function Customers() {
  return (
    <MarketingPageShell
      eyebrow="Customers"
      title="Trusted by platform teams across Europe."
      subtitle="Early access cohort — 2026. These are anonymised until customers opt in to public attribution."
    >
      <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] md:grid-cols-3 mb-16">
        {QUOTES.map((q, i) => (
          <div key={i} className="bg-[color:var(--dg-canvas)] p-7">
            <div className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-6 italic">&ldquo;{q.quote}&rdquo;</div>
            <div className="text-[12px] font-semibold text-[color:var(--dg-fg)]">{q.author}</div>
            <div className="text-[11px] text-[color:var(--dg-fg-subtle)] mb-4">{q.company}</div>
            <div className="flex flex-wrap gap-1.5">
              {q.tags.map((t) => (
                <span key={t} className="rounded border border-[color:var(--dg-border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 text-center">
        <div className="dg-label mb-3">Become a reference customer</div>
        <h2 className="font-sans text-2xl font-semibold text-[color:var(--dg-fg)] mb-3">Get featured + 30% lifetime discount</h2>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-md mx-auto mb-6">We work with a small number of reference customers per quarter. You get a co-authored case study, a 30% lifetime discount, and direct access to the founding team.</p>
        <a href="mailto:customers@driftguard.io" className="dg-button dg-button-primary text-[12px]">Get in touch →</a>
      </div>
    </MarketingPageShell>
  );
}
