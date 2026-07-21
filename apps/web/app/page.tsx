import { TranslationProvider } from "@/components/TranslationProvider";
import { getMessages } from "@/i18n/get-locale";
import { getUserPreferences } from "@/lib/preferences/server";
import { JsonLd } from "@/components/JsonLd";
import { jsonLdSoftware, jsonLdOrg } from "@/lib/seo";

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

          {/* Simple CTA Footer for now */}
          <section className="w-full border-t border-[color:var(--dg-border-strong)] py-24 text-center">
            <h2 className="text-3xl font-medium text-white mb-8">Ready to govern your autonomous fleet?</h2>
            <a href="/login" className="inline-block px-8 py-4 bg-[color:var(--dg-electric)] text-white font-mono text-[11px] uppercase tracking-widest rounded hover:bg-[color:var(--dg-electric-bright)] transition-colors">
              Initialize DriftGuard
            </a>
          </section>
        </main>
      </>
    </TranslationProvider>
  );
}
