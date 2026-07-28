import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { pageMeta, jsonLdBreadcrumb, jsonLdArticle, localizedPageMeta } from "@/lib/seo";



const ENDPOINTS = [
  { method: "GET",    path: "/api/v1/health",                      desc: "docs.api.endpoint_health" },
  { method: "GET",    path: "/api/v1/ready",                       desc: "docs.api.endpoint_ready" },
  { method: "GET",    path: "/api/v1/metrics",                     desc: "docs.api.endpoint_metrics" },
  { method: "POST",   path: "/api/v1/webhooks/github",             desc: "docs.api.endpoint_webhooksGithub" },
  { method: "GET",    path: "/api/v1/orgs/by-installation/{id}",   desc: "docs.api.endpoint_orgsByInstallation" },
  { method: "GET",    path: "/api/v1/orgs/{org_id}/repos",         desc: "docs.api.endpoint_orgsRepos" },
  { method: "GET",    path: "/api/v1/orgs/{org_id}/analyses",      desc: "docs.api.endpoint_orgsAnalyses" },
  { method: "PATCH",  path: "/api/v1/orgs/{org_id}/aws",           desc: "docs.api.endpoint_orgsAws" },
  { method: "GET",    path: "/api/v1/analyses",                    desc: "docs.api.endpoint_analyses" },
  { method: "GET",    path: "/api/v1/analyses/{id}",               desc: "docs.api.endpoint_analysisById" },
  { method: "POST",   path: "/api/v1/memory/recall",               desc: "docs.api.endpoint_memoryRecall" },
  { method: "GET",    path: "/api/v1/repos",                       desc: "docs.api.endpoint_repos" },
  { method: "POST",   path: "/api/v1/billing/checkout",            desc: "docs.api.endpoint_billingCheckout" },
  { method: "POST",   path: "/api/v1/billing/portal",              desc: "docs.api.endpoint_billingPortal" },
  { method: "GET",    path: "/api/v1/aws/verify",                  desc: "docs.api.endpoint_awsVerify" },
];

const METHOD_STYLE: Record<string, string> = {
  GET:    "text-allowed border-allowed/30 bg-allowed/10",
  POST:   "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
  DELETE: "text-blocked border-blocked/30 bg-blocked/10",
  PATCH:  "text-warned border-warned/30 bg-warned/10",
};

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/api",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function ApiReference() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.api.title"), path: "/docs/api" }])}
            eyebrow={t("docs.api.eyebrow")} title={t("docs.api.title")} subtitle={t("docs.api.subtitle")}
    >
      {/* Auth */}
      <section className="mb-12">
        <div className="dg-label mb-4">{t("docs.auth")}</div>
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("docs.api.exampleRequest")}
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)]">{`curl https://api.driftguard.io/api/v1/health \
  -H "Authorization: Bearer $DG_API_KEY"`}</pre>
        </div>
        <p className="mt-3 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("docs.api.errorsFollow")} <code className="font-mono text-[color:var(--dg-electric-bright)]">{"{ detail: string, status: number }"}</code>.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <div className="dg-label mb-4">{t("docs.endpoints")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="grid border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] grid-cols-[80px_1fr_1fr]">
            <span>{t("docs.method")}</span><span>{t("docs.api.pathColumn")}</span><span className="hidden md:inline">{t("docs.description")}</span>
          </div>
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="grid grid-cols-[80px_1fr] md:grid-cols-[80px_1fr_1fr] gap-2 items-start border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] px-4 py-3 transition">
              <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 font-sans font-medium text-[9px] font-bold tracking-widest w-fit ${METHOD_STYLE[e.method] || ""}`}>{e.method}</span>
              <code className="font-mono text-[12px] text-[color:var(--dg-fg)]">{e.path}</code>
              <span className="col-span-2 md:col-span-1 font-mono text-[11px] text-[color:var(--dg-fg-muted)] md:pt-0 pt-0">{t(e.desc)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Memory recall example */}
      <section className="mb-12">
        <div className="dg-label mb-4">{t("docs.recallExample")}</div>
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)]">{`POST /api/v1/memory/recall
{
  "project": "acme-platform",
  "intent": "delete aws_rds_cluster in prod",
  "top_k": 5
}

# 200 OK
{
  "matches": [
    {
      "id": "evt_8x2m",
      "similarity": 0.94,
      "date": "2026-04-22",
      "summary": "RDS deletion blocked by drift detector",
      "resource": "aws_rds_cluster.prod"
    }
  ],
  "latency_ms": 9
}`}</pre>
        </div>
      </section>

      <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 flex flex-col sm:flex-row items-start gap-4 justify-between">
        <div>
          <div className="dg-label mb-2">{t("docs.openApiSpec")}</div>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{t("docs.api.openApiBody")} <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/openapi.json</code>.</p>
        </div>
        <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px] shrink-0">{t("docs.requestAccess")}</a>
      </div>
    </MarketingPageShell>
  );
}
