import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = { title: "Subprocessors — DriftGuard" };

const SUBPROCESSORS = [
  { name: "Google Cloud Platform", purpose: "Cloud infrastructure, storage, database, compute (Cloud Run, Cloud SQL, Cloud Storage)", country: "EU (Belgium, Netherlands)", entity: "Google Ireland Limited" },
  { name: "Anthropic", purpose: "AI analysis — Terraform plan review, security triage, remediation suggestions (claude-sonnet-4-6)", country: "USA", entity: "Anthropic, PBC" },
  { name: "GitHub", purpose: "Source code hosting, webhook delivery, OAuth authentication", country: "USA", entity: "GitHub, Inc." },
  { name: "Stripe", purpose: "Payment processing, subscription management", country: "USA / EU", entity: "Stripe Payments Europe Ltd" },
  { name: "Infracost", purpose: "Cloud cost estimation from Terraform plans", country: "USA", entity: "Infracost Inc." },
  { name: "Sentry", purpose: "Error monitoring and performance tracing (backend only, no PR content)", country: "USA", entity: "Functional Software, Inc." },
];

export default async function Subprocessors() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("subprocessors.eyebrow")} title={t("subprocessors.title")} subtitle={t("subprocessors.subtitle")}
    >
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden mb-10">
        <div className="grid grid-cols-[1fr_2fr_1fr] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          <span>Subprocessor</span>
          <span className="hidden sm:inline">Purpose</span>
          <span>Country</span>
        </div>
        {SUBPROCESSORS.map((s) => (
          <div key={s.name} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr] border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-4 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition gap-1 sm:gap-4 sm:items-start">
            <div>
              <div className="font-mono text-[12px] font-semibold text-[color:var(--dg-fg)]">{s.name}</div>
              <div className="text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">{s.entity}</div>
            </div>
            <div className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)] sm:block hidden">{s.purpose}</div>
            <div className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">{s.country}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 flex flex-col sm:flex-row items-start gap-4 sm:justify-between">
        <div>
          <div className="dg-label mb-2">Objection to subprocessor change</div>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-md">
            Per our DPA, you may object to a new subprocessor within 30 days of notification. Contact{" "}
            <a href="mailto:legal@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">legal@driftguard.io</a>.
          </p>
        </div>
        <a href="/dpa" className="dg-button dg-button-ghost text-[12px] shrink-0">View DPA →</a>
      </div>
    </MarketingPageShell>
  );
}
