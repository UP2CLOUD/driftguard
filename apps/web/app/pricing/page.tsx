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
  const t        = createTranslator(messages);

    const session = await auth();
  const faqData = jsonLdFaq([
    { question: t("pricing.faq.q1"), answer: t("pricing.faq.a1") },
    { question: t("pricing.faq.q2"), answer: t("pricing.faq.a2") },
    { question: t("pricing.faq.q3"), answer: t("pricing.faq.a3") },
    { question: t("pricing.faq.q4"), answer: t("pricing.faq.a4") },
    { question: t("pricing.faq.q5"), answer: t("pricing.faq.a5") },
  ]);

  return (
    <TranslationProvider messages={messages as Record<string, unknown>}>
      <>
        <JsonLd data={faqData} />
        <StatusBar />
        <MarketingNav
          isLoggedIn={!!session}
          initialPreferences={prefs}
          cta={
            !session ? (
              <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
                {t("common.getStarted")}
              </SignInButton>
            ) : undefined
          }
        />
        <main className="bg-[color:var(--dg-canvas)]">
          <Pricing />
        </main>
        <Footer />
      </>
    </TranslationProvider>
  );
}