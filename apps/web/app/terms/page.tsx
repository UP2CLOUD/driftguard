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
    path:        "/terms",
    locale,
    title:       t("terms.meta.title"),
    description: t("terms.meta.description"),
  });
}

export default async function TermsPage() {
  const locale = await getLocale();
  const { terms } = await getLegalContent(locale);
  return (
    <LegalPageShell active="terms">
      <LegalDocument document={terms} />
    </LegalPageShell>
  );
}
