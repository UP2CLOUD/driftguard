import { LegalDocument } from "@/components/LegalDocument";
import { LegalPageShell } from "@/components/LegalPageShell";
import { getLegalContent } from "@/lib/legal-content";
import { getLocale } from "@/i18n/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — DriftGuard",
  description: "Terms governing use of the DriftGuard DevSecOps and FinOps platform operated by UP2CLOUD.",
};

export default async function TermsPage() {
  const locale = await getLocale();
  const { terms } = await getLegalContent(locale);
  return (
    <LegalPageShell active="terms">
      <LegalDocument document={terms} />
    </LegalPageShell>
  );
}
