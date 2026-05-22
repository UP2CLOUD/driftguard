import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = { title: "API Reference — DriftGuard" };

const ENDPOINTS = [
  { method: "GET",    path: "/api/v1/health",                      desc: "Liveness probe. Returns status + uptime + version." },
  { method: "GET",    path: "/api/v1/ready",                       desc: "Readiness probe. Checks DB + Redis. Returns 503 if degraded." },
  { method: "GET",    path: "/api/v1/metrics",                     desc: "Lightweight metrics: uptime, gc counts, pid." },
  { method: "POST",   path: "/api/v1/webhooks/github",             desc: "GitHub App webhook receiver. HMAC-SHA256 verified." },
  { method: "GET",    path: "/api/v1/orgs/by-installation/{id}",   desc: "Get org by GitHub installation ID." },
  { method: "GET",    path: "/api/v1/orgs/{org_id}/repos",         desc: "List repos for an org." },
  { method: "GET",    path: "/api/v1/orgs/{org_id}/analyses",      desc: "List analyses for an org. Query: limit (default 20)." },
  { method: "PATCH",  path: "/api/v1/orgs/{org_id}/aws",           desc: "Save AWS IAM role ARN + state bucket for drift detection." },
  { method: "GET",    path: "/api/v1/analyses",                    desc: "List analyses. Query: repo_id, limit." },
  { method: "GET",    path: "/api/v1/analyses/{id}",               desc: "Get single analysis with findings + AI summary." },
  { method: "POST",   path: "/api/v1/memory/recall",               desc: "Semantic recall: top-k similar past incidents by cosine sim." },
  { method: "GET",    path: "/api/v1/repos",                       desc: "List all repositories across the installation." },
  { method: "POST",   path: "/api/v1/billing/checkout",            desc: "Create Stripe checkout session. Returns {url}." },
  { method: "POST",   path: "/api/v1/billing/portal",              desc: "Create Stripe customer portal session. Returns {url}." },
  { method: "GET",    path: "/api/v1/aws/verify",                  desc: "Test STS AssumeRole with configured credentials." },
];

const METHOD_STYLE: Record<string, string> = {
  GET:    "text-allowed border-allowed/30 bg-allowed/10",
  POST:   "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
  DELETE: "text-blocked border-blocked/30 bg-blocked/10",
  PATCH:  "text-warned border-warned/30 bg-warned/10",
};

export default async function ApiReference() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("docs.api.eyebrow")} title={t("docs.api.title")} subtitle={t("docs.api.subtitle")}
    >
      {/* Auth */}
      <section className="mb-12">
        <div className="dg-label mb-4">Authentication</div>
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Example request
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)]">{`curl https://api.driftguard.io/api/v1/health \
  -H "Authorization: Bearer $DG_API_KEY"`}</pre>
        </div>
        <p className="mt-3 text-[13px] text-[color:var(--dg-fg-muted)]">
          All responses are JSON. Errors follow <code className="font-mono text-[color:var(--dg-electric-bright)]">{"{ detail: string, status: number }"}</code>.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <div className="dg-label mb-4">Endpoints</div>
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="grid border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] grid-cols-[80px_1fr_1fr]">
            <span>Method</span><span>Path</span><span className="hidden md:inline">Description</span>
          </div>
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="grid grid-cols-[80px_1fr] md:grid-cols-[80px_1fr_1fr] gap-2 items-start border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] px-4 py-3 transition">
              <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest w-fit ${METHOD_STYLE[e.method] || ""}`}>{e.method}</span>
              <code className="font-mono text-[12px] text-[color:var(--dg-fg)]">{e.path}</code>
              <span className="col-span-2 md:col-span-1 font-mono text-[11px] text-[color:var(--dg-fg-muted)] md:pt-0 pt-0">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Memory recall example */}
      <section className="mb-12">
        <div className="dg-label mb-4">Semantic recall — example</div>
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
          <div className="dg-label mb-2">OpenAPI spec</div>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">Full spec available at <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/openapi.json</code> on self-hosted deployments.</p>
        </div>
        <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px] shrink-0">Request access →</a>
      </div>
    </MarketingPageShell>
  );
}
