import { LegalDocument } from "@/components/LegalDocument";
import { LegalPageShell } from "@/components/LegalPageShell";
import { getLegalContent } from "@/lib/legal-content";
import { getLocale } from "@/i18n/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DriftGuard",
  description:
    "How DriftGuard and UP2CLOUD collect, use, and protect personal data for our B2B infrastructure intelligence platform.",
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const { privacy } = await getLegalContent(locale);
  return (
    <LegalPageShell active="privacy">
      <LegalDocument document={privacy} />
    </LegalPageShell>
  );
}
