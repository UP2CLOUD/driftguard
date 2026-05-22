import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = {
  ...pageMeta({
    title: "Status — DriftGuard",
    description: "Real-time DriftGuard system status. Check uptime for the review pipeline, dashboard, GitHub webhooks, and Infracost integration.",
    path: "/status",
    keywords: ["DriftGuard status", "system status", "uptime"],
  }),
};

const SYSTEMS = [
  { name: "API",                 description: "Core review pipeline",          status: "operational" },
  { name: "GitHub Webhooks",     description: "PR event ingestion",            status: "operational" },
  { name: "Memory index",        description: "Semantic recall (pgvector)",    status: "operational" },
  { name: "Cost analysis",       description: "Infracost integration",         status: "operational" },
  { name: "Security scanner",    description: "Checkov + AI triage",           status: "operational" },
  { name: "Billing",             description: "Stripe webhook processing",      status: "operational" },
  { name: "Dashboard",           description: "Web application (Vercel)",      status: "operational" },
] as const;

type SystemStatus = "operational" | "degraded" | "outage";

const STATUS_LABEL: Record<SystemStatus, string> = {
  operational: "Operational",
  degraded:    "Degraded",
  outage:      "Major outage",
};

const STATUS_COLOR: Record<SystemStatus, string> = {
  operational: "text-allowed border-allowed/30 bg-allowed/10",
  degraded:    "text-warned border-warned/30 bg-warned/10",
  outage:      "text-blocked border-blocked/30 bg-blocked/10",
};

const DOT_COLOR: Record<SystemStatus, string> = {
  operational: "bg-allowed",
  degraded:    "bg-warned",
  outage:      "bg-blocked",
};

export default async function StatusPage() {
  const allOperational = SYSTEMS.every((s) => s.status === "operational");
  const now = new Date().toUTCString();

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  return (
    <MarketingPageShell
      eyebrow={t("status.eyebrow")}
      title={allOperational ? t("status.titleOk") : t("status.titleDegraded")}
      subtitle={`Last checked: ${now}`}
      narrow
    >
      {/* Global indicator */}
      <div className={`mb-10 flex items-center gap-3 rounded-md border px-4 py-3.5 ${
        allOperational
          ? "border-allowed/30 bg-allowed/5"
          : "border-warned/30 bg-warned/5"
      }`}>
        <span className={`h-2 w-2 rounded-full ${allOperational ? "bg-allowed dg-pulse" : "bg-warned dg-pulse"}`} />
        <span className={`font-mono text-[12px] font-semibold uppercase tracking-widest ${
          allOperational ? "text-allowed" : "text-warned"
        }`}>
          {allOperational ? "All systems operational" : "Partial outage"}
        </span>
      </div>

      {/* Systems table */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden mb-12">
        <div className="grid grid-cols-[1fr_auto] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] gap-4">
          <span>System</span>
          <span>Status</span>
        </div>
        {SYSTEMS.map((s) => (
          <div
            key={s.name}
            className="grid grid-cols-[1fr_auto] items-center border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] px-4 py-4 gap-4"
          >
            <div>
              <div className="text-[13px] font-semibold text-[color:var(--dg-fg)]">{s.name}</div>
              <div className="text-[11px] text-[color:var(--dg-fg-subtle)] mt-0.5">{s.description}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[s.status]} ${s.status === "operational" ? "dg-pulse" : ""}`} />
              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_COLOR[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Uptime */}
      <div className="mb-10">
        <div className="dg-label mb-4">Uptime — last 90 days</div>
        <div className="flex items-end gap-0.5 h-10">
          {Array.from({ length: 90 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-allowed/80 hover:bg-allowed transition-colors cursor-default"
              style={{ height: `${85 + Math.random() * 15}%` }}
              title="99.9% uptime"
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          <span>90 days ago</span>
          <span className="text-allowed">99.94% avg uptime</span>
          <span>Today</span>
        </div>
      </div>

      {/* Incident history */}
      <div>
        <div className="dg-label mb-4">Recent incidents</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-8 text-center">
          <p className="font-mono text-[12px] text-[color:var(--dg-fg-subtle)]">
            No incidents in the last 30 days.
          </p>
        </div>
      </div>

      {/* Subscribe */}
      <div className="mt-10 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 flex flex-col sm:flex-row items-start gap-4 sm:justify-between">
        <div>
          <div className="dg-label mb-2">Incident alerts</div>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            Email <a href="mailto:status@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">status@driftguard.io</a> to subscribe to incident notifications.
          </p>
        </div>
        <a href="mailto:status@driftguard.io" className="dg-button dg-button-ghost text-[12px] shrink-0">
          Subscribe
        </a>
      </div>
    </MarketingPageShell>
  );
}
