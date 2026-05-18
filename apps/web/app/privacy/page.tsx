import { LegalDocument } from "@/components/LegalDocument";
import { LegalPageShell } from "@/components/LegalPageShell";
import { privacyPolicy } from "@/lib/legal-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DriftGuard",
  description:
    "How DriftGuard and UP2CLOUD collect, use, and protect personal data for our B2B infrastructure intelligence platform.",
};

export default async function PrivacyPage() {
  return (
    <LegalPageShell active="privacy">
      <LegalDocument document={privacyPolicy} />
    </LegalPageShell>
  );
}
