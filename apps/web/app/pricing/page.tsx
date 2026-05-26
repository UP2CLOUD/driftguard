import { type Locale } from "@/i18n/config";
import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import type { Metadata } from "next";
import { localizedPageMeta, jsonLdFaq } from "@/lib/seo";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { TranslationProvider } from "@/components/TranslationProvider";
import { JsonLd } from "@/components/JsonLd";

export async function generateMetadata(): Promise<Metadata> {
  const prefs    = await getUserPreferences();
  const locale   = prefs.locale as Locale;
  const messages = await getMessages(locale);
  const t        = createTranslator(messages);
  return localizedPageMeta({
    path:        "/pricing",
    locale,
    title:       t("pricing.meta.title")       || "Pricing — DriftGuard",
    description: t("pricing.meta.description") || "DriftGuard pricing: Free plan, Team €29/repo/month, Enterprise custom.",
    keywords:    ["Terraform PR review pricing", "infrastructure security SaaS", "platform engineering tools"],
  });
}

export default async function PricingPage() {
  const prefs    = await getUserPreferences();
  const locale   = prefs.locale as Locale;
  const messages = await getMessages(locale);

    const session = await auth();
  const faqData = jsonLdFaq([
    { question: "Is DriftGuard free?", answer: "Yes. The Free plan allows unlimited reviews on public repositories. Team plan starts at €29/repo/month for private repos with advanced features." },
    { question: "Does DriftGuard work with OpenTofu?", answer: "Yes. DriftGuard supports any Terraform-compatible toolchain including OpenTofu, Terragrunt, and CDK for Terraform." },
    { question: "How does DriftGuard install?", answer: "DriftGuard installs as a GitHub App in 30 seconds. No SDK, no code changes, no infra modifications required." },
    { question: "What is semantic memory?", answer: "Semantic memory stores every blocked deploy and policy violation as a vector embedding. Future similar PRs trigger automatic recall of the original incident." },
    { question: "Which compliance frameworks does DriftGuard support?", answer: "DriftGuard produces compliance evidence for DORA, NIS2 Article 21, ISO 27001:2022, and CIS Benchmarks as a natural output of the PR review process." },
  ]);

  return (
    <>
      <JsonLd data={faqData} />
      <StatusBar />
      <MarketingNav
        isLoggedIn={!!session}
        cta={
          !session ? (
            <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
              Get started
            </SignInButton>
          ) : undefined
        }
      />
      <main className="bg-[color:var(--dg-canvas)]">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}