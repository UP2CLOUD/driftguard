import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { pageMeta, jsonLdBreadcrumb, jsonLdArticle, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/first-review",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function FirstReview() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: "First review", path: "/docs/first-review" }])}
            eyebrow={t("docs.firstReview.eyebrow")} title={t("docs.firstReview.title")} subtitle={t("docs.firstReview.subtitle")}
      narrow
    >
      <div className="space-y-10 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.whatTriggers")}</h2>
          <p>DriftGuard listens for <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">pull_request</code> events
          with actions <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">opened</code>, <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">synchronize</code>, and <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">reopened</code>.
          Any PR that modifies a <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">.tf</code> or <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">.tofu</code> file triggers the pipeline.
          Non-Terraform PRs are skipped silently.</p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.prAnatomy")}</h2>
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
            {[
              { label: "Risk score", desc: "0–100 weighted by severity. ≥70 posts a failing check run that can block merge." },
              { label: "Cost delta", desc: "+€124/mo — monthly delta from Infracost. Threshold configured in .github/driftguard.yml." },
              { label: "Security findings", desc: "Checkov results mapped to DORA / NIS2 / ISO 27001 controls. Severity: critical → low." },
              { label: "Drift alert", desc: "Resources present in plan but missing from live state (or vice-versa) flagged as drift." },
              { label: "Memory recall", desc: "Top-3 similar past incidents with similarity score. Links to the original PR." },
              { label: "AI review", desc: "Claude summarises the full diff intent, blast radius, and suggested fixes." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3.5">
                <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] shrink-0 mt-0.5 w-28">{item.label}</span>
                <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.checkRun")}</h2>
          <p>{t("docs.checkRunDesc")}</p>
          <ul className="mt-3 space-y-2">
            {[
              ["✓ success", "Risk < 40 — safe to merge"],
              ["◦ neutral", "Risk 40–70 — warnings, team decision"],
              ["✗ failure", "Risk ≥ 70 — blocked. Configure branch protection to enforce."],
            ].map(([label, desc]) => (
              <li key={label} className="flex items-start gap-3">
                <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded shrink-0">{label}</code>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4">Enable branch protection: <em>{t("docs.branchProtection")}</em>.</p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.turnaround")}</h2>
          <p>P50 latency is ~18s. P99 is ~90s for large monorepos with multiple Terraform directories.
          The bottleneck is <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">terraform init + plan</code> — we run up to 3 directories in parallel.</p>
        </section>

        <div className="flex gap-3 pt-4 border-t border-[color:var(--dg-border)]">
          <a href="/docs/policies" className="dg-button dg-button-ghost text-[12px]">{t("docs.configurePolicies")}</a>
          <a href="/docs/drift" className="dg-button dg-button-ghost text-[12px]">{t("docs.driftDetection")}</a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
