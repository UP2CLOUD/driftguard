import { type Locale } from "@/i18n/config";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { localizedPageMeta } from "@/lib/seo";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

export async function generateMetadata(): Promise<Metadata> {
  const prefs    = await getUserPreferences();
  const locale   = prefs.locale as Locale;
  const messages = await getMessages(locale);
  const t        = createTranslator(messages);
  return localizedPageMeta({
    path:        "/docs",
    locale,
    title:       t("docs.meta.title")       || "Documentation — DriftGuard",
    description: t("docs.meta.description") || "DriftGuard documentation: install guide, API reference, core concepts.",
    keywords:    ["DriftGuard docs", "Terraform PR review docs", "infrastructure as code review"],
  });
}

function getSections(t: (key: string) => string) {
  return [
    {
      label: t("docs.getStarted"),
      items: [
        { title: t("docs.item_install_title"),      h: "/docs/install",      desc: t("docs.item_install_desc") },
        { title: t("docs.item_firstReview_title"),  h: "/docs/first-review", desc: t("docs.item_firstReview_desc") },
        { title: t("docs.item_policies_title"),     h: "/docs/policies",     desc: t("docs.item_policies_desc") },
      ],
    },
    {
      label: t("docs.coreConc"),
      items: [
        { title: t("docs.memory.label"),       h: "/docs/memory",   desc: t("docs.item_memory_desc") },
        { title: t("docs.drift.label"),        h: "/docs/drift",    desc: t("docs.item_drift_desc") },
        { title: t("docs.cost.label"),         h: "/docs/cost",     desc: t("docs.item_cost_desc") },
        { title: t("docs.item_security_title"),h: "/docs/security", desc: t("docs.item_security_desc") },
      ],
    },
    {
      label: t("docs.compliance"),
      items: [
        { title: t("docs.item_dora_title"),  h: "/docs/dora",      desc: t("docs.item_dora_desc") },
        { title: t("docs.item_nis2_title"),  h: "/docs/nis2",      desc: t("docs.item_nis2_desc") },
        { title: t("docs.item_iso_title"),   h: "/docs/iso-27001", desc: t("docs.item_iso_desc") },
        { title: t("docs.item_audit_title"), h: "/docs/audit",     desc: t("docs.item_audit_desc") },
      ],
    },
    {
      label: t("docs.integrations"),
      items: [
        { title: t("docs.item_aws_title"),   h: "/docs/aws",   desc: t("docs.item_aws_desc") },
        { title: t("docs.item_gcp_title"),   h: "/docs/gcp",   desc: t("docs.item_gcp_desc") },
        { title: t("docs.item_azure_title"), h: "/docs/azure", desc: t("docs.item_azure_desc") },
        { title: t("docs.item_slack_title"), h: "/docs/slack", desc: t("docs.item_slack_desc") },
      ],
    },
    {
      label: t("docs.sectionDeploy"),
      items: [
        { title: t("docs.item_selfHost_title"), h: "/docs/self-host", desc: t("docs.item_selfHost_desc") },
        { title: t("docs.item_cloudRun_title"), h: "/docs/cloud-run", desc: t("docs.item_cloudRun_desc") },
        { title: t("docs.item_env_title"),      h: "/docs/env",       desc: t("docs.item_env_desc") },
      ],
    },
    {
      label: t("docs.sectionApi"),
      items: [
        { title: t("docs.item_rest_title"),        h: "/docs/api",         desc: t("docs.item_rest_desc") },
        { title: t("docs.item_webhooks_title"),    h: "/docs/webhooks",    desc: t("docs.item_webhooks_desc") },
        { title: t("docs.item_rateLimits_title"),  h: "/docs/rate-limits", desc: t("docs.item_rateLimits_desc") },
      ],
    },
  ];
}

export default async function DocsPage() {
  const prefs = await getUserPreferences();
  const msgs  = await getMessages(prefs.locale);
  const t     = createTranslator(msgs);
  const sections = getSections(t);
  const installUrl = getGitHubAppInstallUrl();
  const QUICKSTART = `# 1. Install the GitHub App on your org
$ open ${installUrl}

# 2. Add .github/driftguard.yml to your repo
policy:
  block: [aws_rds_cluster.*.delete]
  warn: [aws_security_group.ingress.0.0.0.0/0]
compliance:
  frameworks: [DORA, NIS2, ISO27001]

# 3. Open a PR — DriftGuard comments with cost, security, compliance.`;
  return (
    <MarketingPageShell>
      <div className="max-w-3xl">
        <div className="dg-label">{t("docs.documentation")}</div>
        <h1 className="mt-3 font-sans text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("docs.h1")}
        </h1>
        <p className="mt-4 text-[15px] text-[color:var(--dg-fg-muted)]">
          {t("docs.pageSubtitle")}
        </p>
      </div>

      <div className="mt-10 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
        <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 flex items-center justify-between">
          <div className="dg-label">▸ quickstart</div>
          <div className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">~30s</div>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)]">{QUICKSTART}</pre>
        <div className="border-t border-[color:var(--dg-border)] px-4 py-2.5 flex items-center justify-between font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
          <span>.github/driftguard.yml ▪ committed to repo</span>
          <a href={installUrl}
            className="text-[color:var(--dg-electric-bright)] hover:underline">
            ▸ install now
          </a>
        </div>
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div key={s.label}>
            <div className="dg-label flex items-center gap-2 mb-4">
              <span className="h-px w-4 bg-[color:var(--dg-electric)]" />
              {s.label}
            </div>
            <ul className="space-y-1">
              {s.items.map((i) => (
                <li key={i.h}>
                  <Link
                    href={i.h}
                    className="group block rounded border border-transparent hover:border-[color:var(--dg-border)] hover:bg-[color:var(--dg-surface)] px-3 py-2.5 -mx-3 transition"
                  >
                    <div className="text-[13.5px] font-medium text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition flex items-center gap-2">
                      {i.title}
                      <span className="opacity-0 group-hover:opacity-100 transition text-[color:var(--dg-fg-subtle)]">→</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[color:var(--dg-fg-muted)]">{i.desc}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
        <div>
          <div className="dg-label">{t("docs.needHelp")}</div>
          <p className="mt-2 text-[14px] text-[color:var(--dg-fg-muted)] max-w-md">
            {t("docs.helpText")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px]">
            support@driftguard.io
          </a>
          <a href="https://github.com/UP2CLOUD/driftguard/issues" target="_blank" rel="noreferrer"
            className="dg-button dg-button-primary text-[12px]">
            GitHub issues →
          </a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
