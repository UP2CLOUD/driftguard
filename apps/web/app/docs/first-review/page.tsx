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
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.firstReview.title"), path: "/docs/first-review" }])}
            eyebrow={t("docs.firstReview.eyebrow")} title={t("docs.firstReview.title")} subtitle={t("docs.firstReview.subtitle")}
      narrow
    >
      <div className="space-y-10 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.whatTriggers")}</h2>
          <p>{t("docs.firstReview.triggersIntro")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">pull_request</code> {t("docs.firstReview.triggersMiddle")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">opened</code>, <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">synchronize</code>, {t("docs.firstReview.triggersAnd")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">reopened</code>.
          {t("docs.firstReview.triggersFileTypesPrefix")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">.tf</code> {t("docs.firstReview.triggersFileTypesOr")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">.tofu</code> {t("docs.firstReview.triggersFileTypesSuffix")}
          {t("docs.firstReview.triggersSkipped")}</p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.prAnatomy")}</h2>
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
            {[
              { label: t("docs.firstReview.anatomy_riskScore_label"), desc: t("docs.firstReview.anatomy_riskScore_desc") },
              { label: t("docs.firstReview.anatomy_costDelta_label"), desc: t("docs.firstReview.anatomy_costDelta_desc") },
              { label: t("docs.firstReview.anatomy_securityFindings_label"), desc: t("docs.firstReview.anatomy_securityFindings_desc") },
              { label: t("docs.firstReview.anatomy_driftAlert_label"), desc: t("docs.firstReview.anatomy_driftAlert_desc") },
              { label: t("docs.firstReview.anatomy_memoryRecall_label"), desc: t("docs.firstReview.anatomy_memoryRecall_desc") },
              { label: t("docs.firstReview.anatomy_aiReview_label"), desc: t("docs.firstReview.anatomy_aiReview_desc") },
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
              ["✓ success", t("docs.firstReview.checkStatus_success_desc")],
              ["◦ neutral", t("docs.firstReview.checkStatus_neutral_desc")],
              ["✗ failure", t("docs.firstReview.checkStatus_failure_desc")],
            ].map(([label, desc]) => (
              <li key={label} className="flex items-start gap-3">
                <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded shrink-0">{label}</code>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4">{t("docs.firstReview.enableBranchProtection")} <em>{t("docs.branchProtection")}</em>.</p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-3">{t("docs.turnaround")}</h2>
          <p>{t("docs.firstReview.turnaroundBodyIntro")} <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">terraform init + plan</code> {t("docs.firstReview.turnaroundBodyOutro")}</p>
        </section>

        <div className="flex gap-3 pt-4 border-t border-[color:var(--dg-border)]">
          <a href="/docs/policies" className="dg-button dg-button-ghost text-[12px]">{t("docs.configurePolicies")}</a>
          <a href="/docs/drift" className="dg-button dg-button-ghost text-[12px]">{t("docs.driftDetection")}</a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
