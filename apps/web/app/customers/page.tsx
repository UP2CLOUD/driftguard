import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = {
  ...pageMeta({
    title: "Customers — DriftGuard",
    description: "Platform and DevOps teams using DriftGuard to govern AI-written Terraform at scale. Real results from engineering teams.",
    path: "/customers",
    keywords: ["Terraform governance", "AI agent safety", "platform engineering"],
  }),
};

const QUOTES = [
  {
    quote: "Before DriftGuard, our AI agents were writing Terraform that silently deleted production RDS clusters. Every PR now gets a review in under 20 seconds with citations to past incidents.",
    author: "Platform Engineering Lead",
    company: "Series B fintech, EU",
    tags: ["AWS", "AI agents", "DORA"],
  },
  {
    quote: "The compliance evidence alone saved us three weeks of NIS2 audit prep. Compliance controls are now a side effect of our normal deploy process.",
    author: "Head of Security",
    company: "SaaS infrastructure provider, DE",
    tags: ["NIS2", "ISO 27001", "Compliance"],
  },
  {
    quote: "We ran Infracost standalone but the noise was too high. DriftGuard's AI triage surfaces only what actually matters. Cost delta on every PR, zero analyst time.",
    author: "Staff Engineer",
    company: "E-commerce platform, PT",
    tags: ["Cost", "FinOps", "Terraform"],
  },
  {
    quote: "Our Kubernetes team uses Cursor to generate Terraform. DriftGuard is the safety layer between the agent and production. It caught 3 critical misconfigs in the first week.",
    author: "VP Engineering",
    company: "Developer tools company, NL",
    tags: ["AI agents", "Security", "Kubernetes"],
  },
];

const METRICS = [
  { value: "14.7k+", label: "PR reviews / day" },
  { value: "<20s", label: "P50 review latency" },
  { value: "€2.1M", label: "drift cost surfaced" },
  { value: "99.94%", label: "uptime SLA" },
];

const TAG_STYLE = "rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]";

export default async function Customers() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("customers.eyebrow")}
      title={t("customers.title")}
      subtitle={t("customers.subtitle")}
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-16">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-[color:var(--dg-canvas)] px-5 py-6 text-center">
            <div className="font-sans text-2xl sm:text-3xl font-bold text-[color:var(--dg-fg)] tabular-nums">
              {m.value}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quotes */}
      <div className="grid gap-5 sm:grid-cols-2">
        {QUOTES.map((q, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 gap-5"
          >
            <blockquote className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
              &ldquo;{q.quote}&rdquo;
            </blockquote>
            <div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {q.tags.map((t) => (
                  <span key={t} className={TAG_STYLE}>{t}</span>
                ))}
              </div>
              <div className="text-[12px] font-semibold text-[color:var(--dg-fg)]">{q.author}</div>
              <div className="text-[11px] text-[color:var(--dg-fg-subtle)]">{q.company}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 text-center">
        <div className="dg-label mb-3">{t("customers.yourTeamNext")}</div>
        <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-2">
          Start reviewing PRs in 30 seconds
        </h2>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] mb-6 max-w-sm mx-auto">
          No credit card. No infra changes. Works with any Terraform or OpenTofu repo on GitHub.
        </p>
        <a
          href="https://github.com/apps/driftguard-app/installations/new"
          className="dg-button dg-button-primary text-[13px]"
        >
          Install GitHub App — free →
        </a>
      </div>
    </MarketingPageShell>
  );
}
