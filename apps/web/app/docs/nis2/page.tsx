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
    path:        "/docs/nis2",
    locale,
    title:       "NIS2 compliance — DriftGuard",
    description: "Map DriftGuard's Terraform PR checks to NIS2 risk-management and change-control measures, with evidence emitted per pull request.",
  });
}

const CONFIG = `# .github/driftguard.yml
compliance:
  frameworks:
    - nis2            # EU Network & Information Systems Directive 2
  evidence:
    emit: true
    export: audit-log
policy:
  block:
    - aws_security_group.*.ingress.cidr_blocks=0.0.0.0/0   # no open ingress
    - aws_s3_bucket_public_access_block.*.block_public_acls=false`;

export default async function Nis2() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.nis2.title"), path: "/docs/nis2" },
      ])}
      eyebrow={t("docs.nis2.eyebrow")}
      title={t("docs.nis2.title")}
      subtitle={t("docs.nis2.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Which checks map to NIS2</h2>
          <p>
            NIS2 Article 21 requires &ldquo;appropriate and proportionate technical measures&rdquo; to manage risk.
            DriftGuard enforces a subset of those measures directly on the pull request that changes your
            infrastructure:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(a) risk analysis</span> — Checkov + policy engine flag misconfigurations before merge.</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(e) secure change control</span> — a required GitHub Check gates merges; drift detection blocks stale plans.</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">21(2)(f) effectiveness review</span> — the audit log records every decision for later assessment.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Configuration</h2>
          <p>Enable NIS2 evidence and pin the network-exposure rules that most NIS2 assessments look for:</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Evidence per PR</h2>
          <p>
            Each pull request produces an evidence record referencing the NIS2 measures exercised, the check results,
            and the merge decision. Records flow into the append-only audit log. DriftGuard is early access and
            provides evidence to support a NIS2 program — it is not a substitute for a formal audit.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
