import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { jsonLdBreadcrumb, localizedPageMeta } from "@/lib/seo";
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
    path:        "/docs/nis2",
    locale,
    title:       t("docs.nis2.metaTitle"),
    description: t("docs.nis2.metaDescription"),
  });
}

export default async function Nis2() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.nis2.title"), path: "/docs/nis2" },
      ])}
      eyebrow={t("docs.nis2.eyebrow")}
      title={t("docs.nis2.title")}
      subtitle={t("docs.nis2.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.nis2.mappingTitle")}</h2>
          <p>
            {t("docs.nis2.mappingBody")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(a) risk analysis</span> — {t("docs.nis2.item1_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(e) secure change control</span> — {t("docs.nis2.item2_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(f) effectiveness review</span> — {t("docs.nis2.item3_desc")}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.nis2.configTitle")}</h2>
          <p>{t("docs.nis2.configBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.nis2.evidenceTitle")}</h2>
          <p>
            {t("docs.nis2.evidenceBody")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
