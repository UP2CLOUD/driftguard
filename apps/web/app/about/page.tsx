import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/about",
    locale,
    title:       t("about.metaTitle"),
    description: t("about.metaDesc"),
  });
}

export default async function About() {
  const preferences = await getUserPreferences();
  const messages    = await getMessages(preferences.locale);
  const t           = createTranslator(messages);

  const values = [
    { title: t("about.value0Title"), body: t("about.value0Body") },
    { title: t("about.value1Title"), body: t("about.value1Body") },
    { title: t("about.value2Title"), body: t("about.value2Body") },
    { title: t("about.value3Title"), body: t("about.value3Body") },
  ] as const;

  return (
    <MarketingPageShell
      eyebrow={t("about.eyebrow")}
      title={t("about.title")}
      narrow
    >
      <div className="space-y-16">

        {/* Body */}
        <p className="text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)] max-w-2xl">
          {t("about.body")}
        </p>

        {/* Mission */}
        <section>
          <div className="dg-label flex items-center gap-3 mb-4">
            <span className="h-px w-6 bg-[color:var(--dg-electric)]" />
            {t("about.missionEyebrow")}
          </div>
          <h2 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-4">
            {t("about.missionTitle")}
          </h2>
          <p className="text-[14px] leading-relaxed text-[color:var(--dg-fg-muted)] max-w-2xl">
            {t("about.missionBody")}
          </p>
        </section>

        {/* Values */}
        <section>
          <div className="dg-label flex items-center gap-3 mb-4">
            <span className="h-px w-6 bg-[color:var(--dg-electric)]" />
            {t("about.valuesEyebrow")}
          </div>
          <h2 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-8">
            {t("about.valuesTitle")}
          </h2>
          <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="bg-[color:var(--dg-canvas)] px-6 py-6">
                <div className="dg-label mb-2">{v.title}</div>
                <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-sans text-[15px] font-semibold text-[color:var(--dg-fg)] mb-1">
              {t("about.ctaTitle")}
            </h3>
            <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
              {t("about.ctaBody")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a href="/docs" className="dg-button dg-button-primary text-[12px]">
              {t("about.ctaDocs")}
            </a>
            <a
              href="https://github.com/UP2CLOUD/driftguard"
              target="_blank"
              rel="noreferrer"
              className="dg-button dg-button-ghost text-[12px]"
            >
              {t("about.ctaGithub")}
            </a>
          </div>
        </div>

      </div>
    </MarketingPageShell>
  );
}
