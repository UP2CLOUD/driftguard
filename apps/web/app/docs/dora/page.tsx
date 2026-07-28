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
    path:        "/docs/dora",
    locale,
    title:       t("docs.dora.metaTitle"),
    description: t("docs.dora.metaDescription"),
  });
}

const CONFIG = `# .github/driftguard.yml
compliance:
  frameworks:
    - dora            # EU Digital Operational Resilience Act
  evidence:
    emit: true        # attach an evidence record to every PR
    retention_days: 365
    export: audit-log # also stream to the append-only audit log`;

const EVIDENCE = `{
  "framework": "dora",
  "pr": "acme/platform#482",
  "commit": "9f3c1ab",
  "controls": ["ICT-RISK-8.2", "ICT-CHANGE-9.1"],
  "checks": {
    "security": "pass",     // Checkov, 0 high findings
    "drift":    "pass",     // live state matches plan
    "cost":     "warn",     // +$120/mo delta, under block threshold
    "policy":   "pass"      // no blocking rule matched
  },
  "decision": "allow",
  "reviewer": "github:octocat",
  "signed_at": "2026-07-21T10:04:11Z"
}`;

export default async function Dora() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.dora.title"), path: "/docs/dora" },
      ])}
      eyebrow={t("docs.dora.eyebrow")}
      title={t("docs.dora.title")}
      subtitle={t("docs.dora.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.mappingTitle")}</h2>
          <p>
            {t("docs.dora.mappingBody")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">ICT risk (Art. 6–8)</span> — {t("docs.dora.item1_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Change management (Art. 9)</span> — {t("docs.dora.item2_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Learning &amp; evolving (Art. 13)</span> — {t("docs.dora.item3_desc")}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.enableTitle")}</h2>
          <p>{t("docs.dora.enableBody")}</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.evidenceTitle")}</h2>
          <p>
            {(() => {
              const [before, after] = t("docs.dora.evidenceBody").split("{code}");
              return (
                <>
                  {before}
                  <code className="font-mono text-[color:var(--dg-electric-bright)]">evidence.emit</code>
                  {after}
                </>
              );
            })()}
          </p>
          <div className="mt-3">
            <CodeBlock code={EVIDENCE} filename="dora-evidence.json" />
          </div>
          <p className="mt-3">
            {t("docs.dora.evidenceFooter")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
