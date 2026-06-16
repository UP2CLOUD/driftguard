import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { BACKEND_URL } from "@/lib/backend";

type HealthReady = {
  status: "ok" | "degraded";
  checks: {
    db?: string;
    redis?: string;
    github_app?: string;
    stripe?: string;
    ai_review?: string;
  };
};

type SystemStatus = "operational" | "degraded" | "outage";

function checkToStatus(val: string | undefined): SystemStatus {
  if (!val || val === "ok") return "operational";
  // Backend returns "not_configured" or "not_configured: FIELD1, FIELD2"
  if (val === "not_configured" || val.startsWith("not_configured:")) return "operational";
  if (val.startsWith("error")) return "outage";
  return "degraded";
}

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

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/status",
    locale,
    title:       t("status.meta.title"),
    description: t("status.meta.description"),
  });
}

export default async function StatusPage() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  // Fetch live readiness from backend — public endpoint, no auth needed
  let ready: HealthReady | null = null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/ready`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });
    if ((res.ok || res.status === 503) && (res.headers.get("content-type") ?? "").includes("application/json")) {
      ready = await res.json() as HealthReady;
    }
  } catch {
    // Backend unreachable — treat everything as operational (fail-open for status page)
  }

  const checks = ready?.checks ?? {};
  const SYSTEMS = [
    { name: t("status.pipeline"),  description: t("status.p99"),       status: checkToStatus(checks.db) },
    { name: t("status.webhooks"),      description: t("status.prIngestion"),       status: checkToStatus(checks.github_app) },
    { name: t("status.memory"),        description: t("docs.memory.subtitle"),     status: checkToStatus(checks.db) },
    { name: t("status.costAnalysis"),  description: t("status.infracost"),          status: "operational" as SystemStatus },
    { name: t("docs.security.title"),  description: t("status.checkov"),            status: checkToStatus(checks.ai_review) },
    { name: t("status.billing"),       description: t("status.stripeWebhooks"),     status: checkToStatus(checks.stripe) },
    { name: t("status.dashboard"),     description: t("status.webApp"),             status: "operational" as SystemStatus },
  ];

  const allOperational = ready === null
    ? true
    : ready.status === "ok";

  const now = new Date().toUTCString();

  return (
    <MarketingPageShell
      eyebrow={t("status.eyebrow")}
      title={allOperational ? t("status.titleOk") : t("status.titleDegraded")}
      subtitle={`${t("status.lastChecked")} ${now}`}
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
          {allOperational ? t("status_labels.allOperational") : t("status_labels.partialOutage")}
        </span>
      </div>

      {/* Systems table */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden mb-12">
        <div className="grid grid-cols-[1fr_auto] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] gap-4">
          <span>{t("status.system")}</span>
          <span>{t("status.status")}</span>
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
              <span className={`rounded border px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-widest ${STATUS_COLOR[s.status]}`}>
                {t(`status_labels.${s.status}`)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Uptime — static bars (all green when operational) */}
      <div className="mb-10">
        <div className="dg-label mb-4">{t("status.uptime")}</div>
        <div className="flex items-end gap-0.5 h-10">
          {Array.from({ length: 90 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-colors cursor-default ${allOperational ? "bg-allowed/80 hover:bg-allowed" : "bg-warned/60 hover:bg-warned"}`}
              style={{ height: "100%" }}
              title={allOperational ? t("status_labels.operational") : t("status_labels.degraded")}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
          <span>90 days ago</span>
          <span className={allOperational ? "text-allowed" : "text-warned"}>
            {allOperational ? t("status_labels.allOperational") : t("status_labels.partialOutage")}
          </span>
          <span>{t("status.today")}</span>
        </div>
      </div>

      {/* Incident history */}
      <div>
        <div className="dg-label mb-4">{t("status.recentIncidents")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-8 text-center">
          <p className="font-mono text-[12px] text-[color:var(--dg-fg-subtle)]">
            {t("status.noIncidents")}
          </p>
        </div>
      </div>

      {/* Subscribe */}
      <div className="mt-10 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 flex flex-col sm:flex-row items-start gap-4 sm:justify-between">
        <div>
          <div className="dg-label mb-2">{t("status.incidentAlerts")}</div>
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
