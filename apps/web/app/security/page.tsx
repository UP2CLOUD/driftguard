import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta, localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";



const CONTROLS = [
  { label: "Encryption at rest", value: "AES-256 (GCP Cloud Storage + Cloud SQL)" },
  { label: "Encryption in transit", value: "TLS 1.3 minimum" },
  { label: "Authentication", value: "GitHub OAuth 2.0 + JWT (RS256)" },
  { label: "Secrets", value: "GCP Secret Manager — never in env or source" },
  { label: "Data residency", value: "EU-WEST-1 + EU-CENTRAL-1 (Frankfurt, Eemshaven)" },
  { label: "Audit log", value: "Append-only, cryptographically signed events" },
  { label: "Webhook verification", value: "HMAC-SHA256 (GitHub X-Hub-Signature-256)" },
  { label: "AWS credentials", value: "STS AssumeRole only — no long-lived keys stored" },
  { label: "Dependency scanning", value: "Dependabot + Snyk on every PR" },
  { label: "Static analysis", value: "Checkov (IaC) + Bandit (Python) + ESLint" },
  { label: "Penetration testing", value: "Annual third-party pentest (2026 Q3 scheduled)" },
  { label: "SOC 2 Type II", value: "In progress — target Q4 2026" },
];

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/security",
    locale,
    title:       t("security.meta.title"),
    description: t("security.meta.description"),
  });
}

export default async function Security() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("security.eyebrow")} title={t("security.title")} subtitle={t("security.subtitle")}
      narrow
    >
      <section className="mb-12">
        <div className="dg-label mb-4">{t("security.controls")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          {CONTROLS.map((c) => (
            <div key={c.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition">
              <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{c.label}</span>
              <span className="font-mono text-[12px] text-[color:var(--dg-fg)]">{c.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <div className="dg-label mb-4">{t("security.disclosure")}</div>
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6">
          <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-4">
            If you discover a security vulnerability in DriftGuard, please report it to{" "}
            <a href="mailto:security@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">security@driftguard.io</a>.
            We aim to respond within 24 hours and resolve critical issues within 72 hours.
          </p>
          <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
            Please do not open public GitHub issues for security vulnerabilities.
            We will acknowledge your report, keep you updated on our progress, and credit you in our security advisory if desired.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a href="mailto:security@driftguard.io" className="dg-button dg-button-primary text-[12px]">{t("security.reportVuln")}</a>
          </div>
        </div>
      </section>

      <div className="rounded-md border border-[color:var(--dg-border)] p-5 flex items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          Status page
        </div>
        <a href="/status"
          className="flex items-center gap-1.5 font-mono text-[11px] text-allowed hover:underline">
          <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
          status.driftguard.io
        </a>
      </div>
    </MarketingPageShell>
  );
}
