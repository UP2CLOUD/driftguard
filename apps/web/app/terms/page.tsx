import { LegalDocument } from "@/components/LegalDocument";
import { LegalPageShell } from "@/components/LegalPageShell";
import { termsOfService } from "@/lib/legal-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — DriftGuard",
  description: "Terms governing use of the DriftGuard DevSecOps and FinOps platform operated by UP2CLOUD.",
};

export default async function TermsPage() {
  return (
    <LegalPageShell active="terms">
      <LegalDocument document={termsOfService} />
    </LegalPageShell>
  );
}
