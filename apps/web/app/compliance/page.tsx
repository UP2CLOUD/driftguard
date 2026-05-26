import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta, localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";



const FRAMEWORKS = [
  {
    name: "DORA",
    full: "EU Digital Operational Resilience Act",
    status: "evidence-ready",
    articles: ["Art. 9 — ICT risk management", "Art. 10 — Protection & prevention", "Art. 11 — Detection", "Art. 13 — ICT-related incident management"],
    desc: "DriftGuard provides an audit-ready trail of every infrastructure change reviewed, blocked, or approved. Findings and policy decisions are timestamped, signed, and exportable as DORA evidence packs.",
  },
  {
    name: "NIS2",
    full: "Network and Information Security Directive 2",
    status: "evidence-ready",
    articles: ["Art. 21 — Cybersecurity risk measures", "Art. 23 — Incident reporting obligations"],
    desc: "Every DriftGuard PR analysis flags findings against NIS2 risk categories. Incident evidence — severity, blast radius, remediation time — is structured for NIS2 reporting.",
  },
  {
    name: "ISO 27001:2022",
    full: "Information Security Management System",
    status: "evidence-ready",
    articles: ["A.8.8 — Vulnerability management", "A.8.25 — Secure development lifecycle", "A.8.29 — Security testing"],
    desc: "Checkov findings are mapped to ISO 27001 Annex A controls. Security assessment evidence per PR satisfies A.8.29 requirements without additional tooling.",
  },
  {
    name: "GDPR",
    full: "General Data Protection Regulation",
    status: "compliant",
    articles: ["Art. 25 — Data protection by design", "Art. 32 — Security of processing"],
    desc: "DriftGuard processes only repository metadata and infrastructure plan output — no user data, no PII. Data residency is EU-only. DPA available on request.",
  },
  {
    name: "SOC 2 Type II",
    full: "Service Organization Control 2",
    status: "in-progress",
    articles: ["CC6 — Logical access", "CC7 — System operations", "CC8 — Change management"],
    desc: "SOC 2 Type II audit scheduled Q4 2026 with Vanta-assisted readiness. CC8 (change management) evidence is already produced as a side effect of every DriftGuard PR review.",
  },
];

const STATUS_STYLE: Record<string, string> = {
  "evidence-ready": "text-allowed border-allowed/30 bg-allowed/10",
  "compliant": "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
  "in-progress": "text-warned border-warned/30 bg-warned/10",
};
const STATUS_LABEL: Record<string, string> = {
  "evidence-ready": "Evidence ready",
  "compliant": "Compliant",
  "in-progress": "In progress",
};

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/compliance",
    locale,
    title:       t("compliance.meta.title"),
    description: t("compliance.meta.description"),
  });
}

export default async function Compliance() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("compliance.eyebrow")} title={t("compliance.title")} subtitle={t("compliance.subtitle")}
    >
      <div className="space-y-4 mb-16">
        {FRAMEWORKS.map((f) => (
          <div key={f.name} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[14px] font-bold text-[color:var(--dg-fg)]">{f.name}</span>
                <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{f.full}</span>
              </div>
              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_STYLE[f.status]}`}>
                {STATUS_LABEL[f.status]}
              </span>
            </div>
            <div className="p-5 grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-3">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {f.articles.map((a) => (
                    <span key={a} className="rounded border border-[color:var(--dg-border)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4 sm:justify-between">
        <div>
          <div className="dg-label mb-2">{t("compliance.evidencePack")}</div>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-md">Need a pre-packaged compliance evidence export for your auditor? Available on Team and Enterprise plans.</p>
        </div>
        <a href="mailto:compliance@driftguard.io" className="dg-button dg-button-ghost text-[12px] shrink-0">{t("compliance.requestPack")}</a>
      </div>
    </MarketingPageShell>
  );
}
