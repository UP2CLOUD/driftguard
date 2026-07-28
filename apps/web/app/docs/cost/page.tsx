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
    path:        "/docs/cost",
    locale,
    title:       t("docs.cost.metaTitle"),
    description: t("docs.cost.metaDescription"),
  });
}

export default async function Cost() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.cost.title"), path: "/docs/cost" }])}
      eyebrow={t("docs.cost.eyebrow")} title={t("docs.cost.title")} subtitle={t("docs.cost.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.poweredByInfracost")}</h2>
        <p>{t("docs.cost.poweredByInfracostBody")}</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.thresholds")}</h2>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">{`# .github/driftguard.yml
cost:
  threshold_monthly_usd: 500    # warn above $500/mo delta
  block_above: 5000             # block merge above $5000/mo delta`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.currency")}</h2>
        <p>{t("docs.cost.currencyBody")}</p></div>
      </div>
    </MarketingPageShell>
  );
}
