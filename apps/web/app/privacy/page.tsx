import { type Locale } from "@/i18n/config";
import { LegalDocument } from "@/components/LegalDocument";
import { LegalPageShell } from "@/components/LegalPageShell";
import { getLegalContent } from "@/lib/legal-content";
import { getLocale } from "@/i18n/get-locale";
import type { Metadata } from "next";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { localizedPageMeta } from "@/lib/seo";


export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/privacy",
    locale,
    title:       t("privacy.meta.title"),
    description: t("privacy.meta.description"),
  });
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const { privacy } = await getLegalContent(locale);
  return (
    <LegalPageShell active="privacy">
      <LegalDocument document={privacy} />
    </LegalPageShell>
  );
}
