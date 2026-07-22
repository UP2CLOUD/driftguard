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
    path:        "/docs/audit",
    locale,
    title:       "Audit log — DriftGuard",
    description: "DriftGuard's append-only, tamper-evident audit log records every review, approval, and override across your infrastructure pull requests.",
  });
}

const CONFIG = `# .github/driftguard.yml
compliance:
  evidence:
    emit: true
    export: audit-log     # required to populate the audit log
    retention_days: 365`;

const RECORD = `{
  "seq": 10482,
  "prev_hash": "sha256:0f1a…c93",   // chained to the previous record
  "hash": "sha256:7b22…e10",
  "event": "merge_decision",
  "pr": "acme/platform#482",
  "decision": "block",
  "reason": "policy: aws_rds_cluster.prod.delete",
  "actor": "github:octocat",
  "at": "2026-07-21T10:04:11Z"
}`;

export default async function Audit() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.audit.title"), path: "/docs/audit" },
      ])}
      eyebrow={t("docs.audit.eyebrow")}
      title={t("docs.audit.title")}
      subtitle={t("docs.audit.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">What gets recorded</h2>
          <p>
            The audit log is an append-only event stream. Every review, check result, approval, override, and merge
            decision produces a record. Records are chained by hash — each one references the hash of the previous
            record — so any deletion or edit breaks the chain and is detectable.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Analysis started / completed for a PR</li>
            <li>Check result posted (security, drift, cost, policy)</li>
            <li>Merge decision — allow, warn, or block, with the triggering rule</li>
            <li>Manual override, with the actor who performed it</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Enable the log</h2>
          <p>The audit log is populated whenever evidence export is turned on:</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Record shape</h2>
          <p>Each record is JSON with a hash chain field. Export the full stream from the dashboard for auditors:</p>
          <div className="mt-3">
            <CodeBlock code={RECORD} filename="audit-record.json" />
          </div>
          <p className="mt-3">
            DriftGuard is early access; the export format may change. Treat the log as supporting evidence for your
            change-management process.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
