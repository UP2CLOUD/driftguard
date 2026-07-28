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
    path:        "/docs/memory",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function Memory() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.memory.title"), path: "/docs/memory" }])}
      eyebrow={t("docs.memory.eyebrow")} title={t("docs.memory.title")} subtitle={t("docs.memory.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <Section title={t("docs.description")}>
          {t("docs.memory.embeddingBody")}
        </Section>
        <Section title={t("docs.howItWorks")}>
          {t("docs.memory.howItWorksBody")}
        </Section>
        <Section title={t("docs.description")}>
          {t("docs.memory.isolationBody")}
        </Section>
        <Section title={t("docs.apiRef")}>
          {t("docs.memory.apiRefBodyPre")} <code className="font-mono text-[color:var(--dg-electric-bright)]">{t("docs.postRecall")}</code>{t("docs.memory.apiRefBodyMid")} <a href="/docs/api" className="text-[color:var(--dg-electric-bright)] hover:underline">{t("docs.apiRef")}</a> {t("docs.memory.apiRefBodyPost")}
        </Section>
      </div>
    </MarketingPageShell>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
