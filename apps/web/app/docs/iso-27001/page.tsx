import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { jsonLdBreadcrumb, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { CodeBlock } from "@/components/docs/CodeBlock";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/iso-27001",
    locale,
    title:       "ISO 27001 mapping — DriftGuard",
    description: "How DriftGuard's Terraform PR checks map to ISO/IEC 27001:2022 Annex A controls, with per-PR evidence for your ISMS.",
  });
}

const CONFIG = `# .github/driftguard.yml
compliance:
  frameworks:
    - iso-27001       # ISO/IEC 27001:2022 Annex A
  evidence:
    emit: true
    export: audit-log`;

const CONTROLS: { id: string; name: string; check: string }[] = [
  { id: "A.8.9",  name: "Configuration management", check: "Checkov scans every Terraform plan for misconfiguration." },
  { id: "A.8.32", name: "Change management",        check: "Required GitHub Check gates merges; drift detection blocks stale plans." },
  { id: "A.8.15", name: "Logging",                  check: "Append-only audit log captures every review and override." },
  { id: "A.5.7",  name: "Threat intelligence",      check: "Semantic recall links changes to prior incidents." },
];

export default async function Iso27001() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.iso.title"), path: "/docs/iso-27001" },
      ])}
      eyebrow={t("docs.iso.eyebrow")}
      title={t("docs.iso.title")}
      subtitle={t("docs.iso.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-[color:var(--dg-fg)]">Annex A control mapping</h2>
          <p>
            DriftGuard automates operating evidence for the Annex A controls most relevant to
            infrastructure-as-code. It does not certify your ISMS — it produces the artefacts an auditor asks for.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-[color:var(--dg-border)]">
            {CONTROLS.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-1 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3 last:border-b-0 sm:grid-cols-[90px_1fr]"
              >
                <span className="font-mono text-[12px] text-[color:var(--dg-electric-bright)]">{c.id}</span>
                <span className="text-[12px] text-[color:var(--dg-fg)]">
                  <span className="font-semibold">{c.name}</span> — {c.check}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Enable ISO 27001 evidence</h2>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Evidence per PR</h2>
          <p>
            Every pull request emits a signed evidence record listing the Annex A controls exercised and the merge
            decision, then streams it to the append-only audit log. Export the log to attach change-management
            evidence to your Statement of Applicability. DriftGuard is in early access.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
