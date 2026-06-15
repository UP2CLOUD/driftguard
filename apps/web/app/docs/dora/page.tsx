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
    path:        "/docs/dora",
    locale,
    title:       `${t("docs.dora.title")} — DriftGuard`,
    description: t("docs.dora.subtitle"),
  });
}

export default async function Dora() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.dora.title"), path: "/docs/dora" },
      ])}
      eyebrow={t("docs.dora.eyebrow")}
      title={t("docs.dora.title")}
      subtitle={t("docs.dora.subtitle")}
      narrow
    >
      <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
        <div>
          <div className="dg-label">{t("docs.needHelp")}</div>
          <p className="mt-2 text-[14px] text-[color:var(--dg-fg-muted)] max-w-md">
            {t("docs.helpText")}
          </p>
        </div>
        <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px] shrink-0">
          support@driftguard.io
        </a>
      </div>
    </MarketingPageShell>
  );
}
