import { auth } from "@/auth";
import { getInstallations } from "@/lib/installations";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { DriftPreview } from "@/components/landing/DriftPreview";
import { Architecture } from "@/components/landing/Architecture";
import { SemanticMemory } from "@/components/landing/SemanticMemory";
import { IncidentTimeline } from "@/components/landing/IncidentTimeline";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Metrics } from "@/components/landing/Metrics";
import { CodeIntegration } from "@/components/landing/CodeIntegration";
import { Pricing } from "@/components/landing/Pricing";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { HashScroll } from "@/components/HashScroll";

export default async function Page() {
  const session = await auth();
  const isLoggedIn = !!session;
  // Resolve first installation for live data in Metrics + IncidentTimeline
  const installations = isLoggedIn ? await getInstallations(session) : [];
  const installationId = installations[0]?.id ?? undefined;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const cta = (
    <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
      Get started
    </SignInButton>
  );

  return (
    <>
      <HashScroll />
      <StatusBar />
      <MarketingNav isLoggedIn={isLoggedIn} cta={!isLoggedIn ? cta : undefined} />

      {/* 1. Hook — what we do and why it matters */}
      <Hero
        ctaPrimary={
          !isLoggedIn ? (
            <SignInButton className="dg-button dg-button-primary text-[13px] px-5 py-2.5">
              Install GitHub App — free
            </SignInButton>
          ) : (
            <Link href="/dashboard" className="dg-button dg-button-primary text-[13px] px-5 py-2.5">
              Dashboard →
            </Link>
          )
        }
        ctaSecondary={
          <Link href="/docs/install" className="dg-button dg-button-ghost text-[12px]">
            Read the docs
          </Link>
        }
      />

      {/* 2. Social proof */}
      <TrustBar />

      {/* 3. The aha moment — interactive PR review table */}
      <DriftPreview />

      {/* 4. How it prevents incidents — live event feed */}
      <IncidentTimeline installationId={installationId} />

      {/* 5. How the system works architecturally */}
      <Architecture />

      {/* 6. The differentiator — semantic memory */}
      <SemanticMemory />

      {/* 7. Feature breakdown */}
      <FeatureGrid />

      {/* 8. Scale signals */}
      <Metrics installationId={installationId} />

      {/* 9. Integration — how easy it is */}
      <CodeIntegration />

      {/* 10. Pricing */}
      <Pricing />

      {/* 11. CTA */}
      <CtaSection
        title={t("landing.ctaTitle") || undefined}
        subtitle={t("landing.ctaSubtitle") || undefined}
        readDocsLabel={t("landing.ctaReadDocs") || undefined}
        cta={
          <SignInButton className="dg-button dg-button-primary text-[14px] px-6 py-3">
            {t("landing.ctaButton") ?? "Install GitHub App — free"}
          </SignInButton>
        }
      />

      <Footer />
    </>
  );
}
