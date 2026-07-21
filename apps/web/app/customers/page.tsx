import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta, localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { getGitHubAppInstallUrl } from "@/lib/github-app";



// Illustrative use cases — NOT customer testimonials. DriftGuard is in early
// access; these describe the kinds of risks it is built to catch on a PR,
// written as scenarios rather than attributed to real people or companies.
const SCENARIOS: { title: string; body: string; tags: string[] }[] = [
  {
    title: "Agent-written Terraform that would drop a database",
    body: "An AI agent opens a PR that replaces an aws_db_instance in a way that forces a destroy/recreate. DriftGuard flags the destructive plan and recalls a prior incident on the same resource before it merges.",
    tags: ["AWS", "AI agents", "Drift"],
  },
  {
    title: "Compliance evidence as a side effect of review",
    body: "Every reviewed PR emits DORA / NIS2 / ISO 27001 control evidence, so audit prep draws on the normal deploy process instead of a separate spreadsheet exercise.",
    tags: ["NIS2", "ISO 27001", "Compliance"],
  },
  {
    title: "Cost delta on every pull request",
    body: "DriftGuard runs Infracost on the plan and surfaces the monthly cost change inline, with policy thresholds that can warn or block — so cost review doesn't need a dedicated analyst.",
    tags: ["Cost", "FinOps", "Terraform"],
  },
  {
    title: "A safety layer between the agent and production",
    body: "Teams generating Terraform with coding agents use DriftGuard as the merge gate: security misconfigurations (public ACLs, open security groups) are caught by policy before they reach main.",
    tags: ["AI agents", "Security", "Policy"],
  },
];

// Factual product facts — not adoption metrics.
const FACTS: { value: string; label: string }[] = [
  { value: "6", label: "analysis dimensions" },
  { value: "TF + OpenTofu", label: "supported IaC" },
  { value: "3", label: "compliance frameworks" },
  { value: "PR-native", label: "GitHub Checks" },
];

const TAG_STYLE = "rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-1.5 py-0.5 font-sans font-medium text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/customers",
    locale,
    title:       t("customers.meta.title"),
    description: t("customers.meta.description"),
  });
}

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
      {/* Early-access disclosure */}
      <div className="mb-10 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/60 px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[color:var(--dg-electric-bright)]">◆</span>
        <p className="font-mono text-[11px] leading-relaxed text-[color:var(--dg-fg-muted)]">
          {t("customers.earlyAccessNote")}
        </p>
      </div>

      {/* Product facts (not adoption metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-16">
        {FACTS.map((m) => (
          <div key={m.label} className="bg-[color:var(--dg-canvas)] px-5 py-6 text-center">
            <div className="font-sans text-xl sm:text-2xl font-bold text-[color:var(--dg-fg)]">
              {m.value}
            </div>
            <div className="mt-1 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Example scenarios */}
      <div className="dg-label mb-4">{t("customers.scenariosLabel")}</div>
      <div className="grid gap-5 sm:grid-cols-2">
        {SCENARIOS.map((q, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 gap-5"
          >
            <div>
              <h3 className="mb-2 font-sans text-[14px] font-semibold text-[color:var(--dg-fg)]">
                {q.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
                {q.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {q.tags.map((tag) => (
                <span key={tag} className={TAG_STYLE}>{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 text-center">
        <div className="dg-label mb-3">{t("customers.yourTeamNext")}</div>
        <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-2">
          {t("customers.ctaTitle")}
        </h2>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] mb-6 max-w-sm mx-auto">
          {t("customers.ctaBody")}
        </p>
        <a
          href={getGitHubAppInstallUrl()}
          className="dg-button dg-button-primary text-[13px]"
        >
          {t("customers.ctaButton")}
        </a>
      </div>
    </MarketingPageShell>
  );
}
