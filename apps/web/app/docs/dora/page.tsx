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
    title:       "DORA evidence — DriftGuard",
    description: "Map DriftGuard's Terraform PR checks to DORA operational-resilience requirements and emit signed evidence per pull request.",
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
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Which checks map to DORA</h2>
          <p>
            DORA asks financial entities to manage ICT risk across change management, resilience testing, and
            incident handling. DriftGuard contributes evidence for the change-management and ICT-risk articles by
            gating every infrastructure PR through the same review pipeline:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">ICT risk (Art. 6–8)</span> — Checkov security misconfig scan + policy gate on each change.</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Change management (Art. 9)</span> — live-state drift detection proves the plan matches reality before merge.</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Learning &amp; evolving (Art. 13)</span> — semantic recall surfaces prior incidents linked to the same resources.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Enable the compliance block</h2>
          <p>Turn on DORA evidence collection in your canonical config file:</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Evidence emitted per PR</h2>
          <p>
            When <code className="font-mono text-[color:var(--dg-electric-bright)]">evidence.emit</code> is on, DriftGuard
            writes a signed record for each pull request — the checks that ran, the merge decision, and the reviewer.
            Records are exported to the tamper-evident audit log so auditors can reconstruct any change.
          </p>
          <div className="mt-3">
            <CodeBlock code={EVIDENCE} filename="dora-evidence.json" />
          </div>
          <p className="mt-3">
            DriftGuard is in early access — control identifiers are advisory and should be reviewed with your own
            compliance team. It is a source of evidence, not a certification.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
