import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { WaitlistForm } from "@/components/WaitlistForm";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/waitlist",
    locale,
    title:       `${t("waitlist.title")} — DriftGuard`,
    description: t("waitlist.subtitle"),
  });
}

export default async function WaitlistPage() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      eyebrow="Early access"
      title={t("waitlist.title")}
      subtitle={t("waitlist.subtitle")}
      narrow
    >
      <div className="space-y-6">
        <WaitlistForm theme="dark" />
        <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
          {t("waitlist.note")}
        </p>
      </div>
    </MarketingPageShell>
  );
}
