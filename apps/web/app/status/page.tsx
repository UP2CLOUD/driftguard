import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { BACKEND_URL } from "@/lib/backend";
import { checkToStatus, deriveAllOperational, deriveBannerTone, type SystemStatus } from "@/lib/status-page";

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

const STATUS_COLOR: Record<SystemStatus, string> = {
  operational: "text-allowed border-allowed/30 bg-allowed/10",
  degraded:    "text-warned border-warned/30 bg-warned/10",
  outage:      "text-blocked border-blocked/30 bg-blocked/10",
  unknown:     "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]",
};

const DOT_COLOR: Record<SystemStatus, string> = {
  operational: "bg-allowed",
  degraded:    "bg-warned",
  outage:      "bg-blocked",
  unknown:     "bg-[color:var(--dg-fg-subtle)]",
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

  // Fetch live readiness from backend — public endpoint, no auth needed.
  // `reachable` is tracked separately from `ready`: a successful fetch that
  // returns a degraded body is a real, reportable state; a failed fetch is a
  // *different* state (we don't know) and must never be rendered as if it
  // were "operational" — see checkToStatus and the banner below.
  let ready: HealthReady | null = null;
  let reachable = false;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/ready`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });
    if ((res.ok || res.status === 503) && (res.headers.get("content-type") ?? "").includes("application/json")) {
      ready = await res.json() as HealthReady;
      reachable = true;
    }
  } catch {
    // Backend unreachable. Leave `reachable` false — every row below renders
    // "unknown", and the banner says so explicitly, rather than defaulting to
    // "all systems operational" when we have no basis for that claim.
  }

  const checks = ready?.checks ?? {};
  // Every row here is backed by a real signal from /api/v1/ready. Two rows
  // that previously existed — "Cost analysis" and "Dashboard" — had no check
  // behind them at all and were hardcoded to "operational"; they're gone
  // rather than fabricated. The row that read `checks.ai_review` used to be
  // labelled "Security" (a Checkov description with an unrelated AI-review
  // status badge); it's now its own correctly-labelled row.
  const SYSTEMS: { name: string; description: string; status: SystemStatus }[] = [
    { name: t("status.pipeline"), description: t("status.p99"),         status: checkToStatus(checks.db) },
    { name: t("status.webhooks"), description: t("status.prIngestion"), status: checkToStatus(checks.github_app) },
    { name: t("status.memory"),   description: t("docs.memory.subtitle"), status: checkToStatus(checks.db) },
    { name: t("status.aiReview"), description: t("status.aiReviewDesc"), status: checkToStatus(checks.ai_review) },
    { name: t("status.billing"),  description: t("status.stripeWebhooks"), status: checkToStatus(checks.stripe) },
  ];

  const allOperational = deriveAllOperational(reachable, SYSTEMS.map((s) => s.status));
  const bannerTone = deriveBannerTone(reachable, allOperational);

  const now = new Date().toUTCString();

  const BANNER_CLASSES: Record<typeof bannerTone, { border: string; dot: string; text: string }> = {
    operational: { border: "border-allowed/30 bg-allowed/5", dot: "bg-allowed dg-pulse", text: "text-allowed" },
    degraded:    { border: "border-warned/30 bg-warned/5",   dot: "bg-warned dg-pulse",  text: "text-warned" },
    unknown:     {
      border: "border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]",
      dot: "bg-[color:var(--dg-fg-subtle)]",
      text: "text-[color:var(--dg-fg-subtle)]",
    },
  };
  const banner = BANNER_CLASSES[bannerTone];
  const bannerLabel = !reachable
    ? t("status.unreachableTitle")
    : allOperational
      ? t("status_labels.allOperational")
      : t("status_labels.partialOutage");

  return (
    <MarketingPageShell
      eyebrow={t("status.eyebrow")}
      title={!reachable ? t("status.unreachableTitle") : allOperational ? t("status.titleOk") : t("status.titleDegraded")}
      subtitle={`${t("status.lastChecked")} ${now}`}
      narrow
    >
      {/* Global indicator */}
      <div className={`mb-10 flex items-center gap-3 rounded-md border px-4 py-3.5 ${banner.border}`}>
        <span className={`h-2 w-2 rounded-full ${banner.dot}`} />
        <span className={`font-mono text-[12px] font-semibold uppercase tracking-widest ${banner.text}`}>
          {bannerLabel}
        </span>
      </div>

      {!reachable && (
        <div className="mb-10 rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-3.5">
          <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{t("status.unreachable")}</p>
        </div>
      )}

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

      {/* No historical uptime store exists yet (no status_history table, no
          snapshot job) — a 90-bar chart here previously repainted the *current*
          check across all 90 days, which is fabricated history, not real
          history. Say so plainly instead of inventing a track record. */}
      <div className="mb-10">
        <div className="dg-label mb-4">{t("status.uptime")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-4">
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)]">{t("status.uptimeUnavailable")}</p>
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
