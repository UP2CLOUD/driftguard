import Link from "next/link";
import { TranslationProvider } from "@/components/TranslationProvider";
import { getMessages } from "@/i18n/get-locale";
import { getUserPreferences } from "@/lib/preferences/server";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdSoftware, jsonLdOrg } from "@/lib/seo";
import { MarketingFooter } from "@/components/MarketingFooter";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

import { CommandNav } from "@/components/marketing/CommandNav";
import { HeroMissionControl } from "@/components/marketing/HeroMissionControl";
import { PolicySimulatorDemo } from "@/components/marketing/PolicySimulatorDemo";
import { RuntimeArchitectureMap } from "@/components/marketing/RuntimeArchitectureMap";
import { ComplianceHeatmap } from "@/components/marketing/ComplianceHeatmap";

export default async function Page() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);

  return (
    <TranslationProvider messages={messages as Record<string, unknown>}>
      <>
        <JsonLd data={[jsonLdSoftware(), jsonLdOrg()]} />
        
        <CommandNav />

        {/* Global Particle/Network Background */}
        <div className="fixed inset-0 pointer-events-none z-[-1] dg-grid dg-grain opacity-50" />
        <div className="fixed inset-0 pointer-events-none z-[-1] dg-vignette" />

        <main className="min-h-screen">
          <section id="hero" className="w-full">
            <HeroMissionControl />
          </section>

          <section id="demo" className="w-full border-t border-[color:var(--dg-border-strong)] bg-black/40 backdrop-blur-md">
            <PolicySimulatorDemo />
          </section>

          <section id="architecture" className="w-full border-t border-[color:var(--dg-border-strong)]">
            <RuntimeArchitectureMap />
          </section>

          <section id="compliance" className="w-full border-t border-[color:var(--dg-border-strong)] bg-black/40 backdrop-blur-md">
            <ComplianceHeatmap />
          </section>

          {/* Closing CTA */}
          <section className="w-full border-t border-[color:var(--dg-border-strong)] py-24 text-center">
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
                className="inline-block rounded bg-[color:var(--dg-electric)] px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)]"
              >
                Install the GitHub App
              </a>
              <Link
                href="/docs/install"
                className="inline-block rounded border border-[color:var(--dg-border-strong)] px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)]"
              >
                Installation guide
              </Link>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </>
    </TranslationProvider>
  );
}
