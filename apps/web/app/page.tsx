import Link from "next/link";
import { TranslationProvider } from "@/components/TranslationProvider";
import { getMessages } from "@/i18n/get-locale";
import { getUserPreferences } from "@/lib/preferences/server";
import { createTranslator } from "@/i18n/translator";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdProduct, jsonLdFaq } from "@/lib/seo";
import { MarketingFooter } from "@/components/MarketingFooter";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { type Locale } from "@/i18n/config";

import { CommandNav } from "@/components/marketing/CommandNav";
import { HeroMissionControl } from "@/components/marketing/HeroMissionControl";
import { TrustBar } from "@/components/marketing/TrustBar";
import { PolicySimulatorDemo } from "@/components/marketing/PolicySimulatorDemo";
import { RuntimeArchitectureMap } from "@/components/marketing/RuntimeArchitectureMap";
import { ComplianceHeatmap } from "@/components/marketing/ComplianceHeatmap";
import { EvidenceLab } from "@/components/marketing/EvidenceLab";
import { BriefingSection } from "@/components/marketing/BriefingForm";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { Reveal } from "@/components/marketing/Reveal";

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export default async function Page() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const locale = preferences.locale as Locale;
  const t = createTranslator(messages);

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`marketing.faq.${key}_question`),
    answer:   t(`marketing.faq.${key}_answer`),
  }));

  return (
    <TranslationProvider messages={messages as Record<string, unknown>}>
      <>
        <JsonLd
          data={[
            jsonLdProduct({ name: "DriftGuard", description: t("seo.description"), locale }),
            jsonLdFaq(faqItems),
          ]}
        />

        <CommandNav initialPreferences={preferences} />

        {/* Global Particle/Network Background */}
        <div className="fixed inset-0 pointer-events-none z-[-1] dg-grid dg-grain opacity-50" />
        <div className="fixed inset-0 pointer-events-none z-[-1] dg-vignette" />

        <main className="min-h-screen">
          <section id="hero" className="w-full">
            <HeroMissionControl />
          </section>

          <TrustBar />

          <section id="demo" className="w-full border-t border-[color:var(--dg-border-strong)] bg-black/40 backdrop-blur-md">
            <PolicySimulatorDemo />
          </section>

          <section id="architecture" className="w-full border-t border-[color:var(--dg-border-strong)]">
            <RuntimeArchitectureMap />
          </section>

          <section id="compliance" className="w-full border-t border-[color:var(--dg-border-strong)] bg-black/40 backdrop-blur-md">
            <ComplianceHeatmap />
          </section>

          <section className="w-full border-t border-[color:var(--dg-border-strong)]">
            <EvidenceLab />
          </section>

          <section className="w-full border-t border-[color:var(--dg-border-strong)] bg-black/40 backdrop-blur-md">
            <PricingTeaser />
          </section>

          <section className="w-full border-t border-[color:var(--dg-border-strong)]">
            <BriefingSection />
          </section>

          {/* FAQ — native <details>/<summary> so content is crawlable and
              accessible without JS; text here must match jsonLdFaq() above
              exactly, since structured data has to reflect visible content. */}
          <section className="w-full border-t border-[color:var(--dg-border-strong)] py-20">
            <Reveal className="mx-auto max-w-3xl px-6">
              <div className="dg-label mb-3 flex items-center gap-3">
                <span className="h-px w-6 bg-[color:var(--dg-electric)]" />
                {t("marketing.faq.eyebrow")}
              </div>
              <h2 className="mb-8 text-2xl font-semibold text-[color:var(--dg-fg)] sm:text-3xl">
                {t("marketing.faq.title")}
              </h2>
              <div className="divide-y divide-[color:var(--dg-border)]">
                {faqItems.map((item) => (
                  <details key={item.question} className="group py-5">
                    <summary className="flex cursor-pointer touch-manipulation list-none items-center justify-between gap-4 text-[15px] font-medium text-[color:var(--dg-fg)] marker:content-none">
                      {item.question}
                      <span className="shrink-0 font-mono text-[color:var(--dg-fg-subtle)] transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--dg-fg-muted)]">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </section>

          {/* Closing CTA — focused reveal, minimal decorative movement */}
          <section className="w-full border-t border-[color:var(--dg-border-strong)] py-24 text-center">
            <Reveal>
              <h2 className="mx-auto mb-4 max-w-2xl px-6 text-3xl font-medium text-white">
                Ship Terraform your agents can&apos;t break.
              </h2>
              <p className="mx-auto mb-8 max-w-xl px-6 text-[15px] text-[color:var(--dg-fg-muted)]">
                Install the GitHub App and DriftGuard reviews your next infrastructure pull request —
                cost, security, drift, and compliance — before it merges.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={getGitHubAppInstallUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-manipulation inline-block rounded bg-[color:var(--dg-electric)] px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.97]"
                >
                  Install the GitHub App
                </a>
                <Link
                  href="/docs/install"
                  className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
                >
                  Installation guide
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <MarketingFooter />
      </>
    </TranslationProvider>
  );
}
