import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import { formatDate } from "@/lib/format-date";

async function fetchIncidents(id: string, status?: string) {
  const q = status ? `&status=${status}` : "";
  return (
    (await beGet<unknown[]>(
      `/api/v1/incidents?installation_id=${id}&limit=50${q}`,
      { revalidate: 15, timeout: 3000 },
    )) ?? []
  );
}

const SEV: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/5",
  high: "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/5",
  medium: "text-warned border-warned/30 bg-warned/5",
  low: "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)]",
};

const STATUS_DOT: Record<string, string> = {
  open: "bg-blocked",
  investigating: "bg-warned",
  resolved: "bg-allowed",
  suppressed: "bg-[color:var(--dg-fg-subtle)]",
};

const STATUS_BADGE: Record<string, string> = {
  open: "text-blocked border-blocked/30 bg-blocked/5",
  investigating: "text-warned border-warned/30 bg-warned/5",
  resolved: "text-allowed border-allowed/30 bg-allowed/5",
  suppressed: "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]",
};

export default async function IncidentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ installationId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;
  const { filter } = await searchParams;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const [open, resolved, investigating] = await Promise.all([
    fetchIncidents(installationId, "open"),
    fetchIncidents(installationId, "resolved"),
    fetchIncidents(installationId, "investigating"),
  ]);

  const allIncidents = [...open, ...investigating, ...resolved];

  const filtered =
    filter === "open"
      ? open
      : filter === "investigating"
        ? investigating
        : filter === "resolved"
          ? resolved
          : allIncidents;

  const tabs = [
    { key: "all", label: t("incidents.tabAll"), count: allIncidents.length },
    { key: "open", label: t("incidents.tabOpen"), count: open.length },
    { key: "investigating", label: t("incidents.tabInvestigating"), count: investigating.length },
    { key: "resolved", label: t("incidents.tabResolved"), count: resolved.length },
  ];

  const activeTab = filter ?? "all";

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="dg-label mb-1.5 sm:mb-2">{t("incidents.eyebrow") ?? "Drift monitoring"}</div>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("incidents.title") ?? "Incidents"}
        </h1>
      </div>

      {/* Filter tabs — horizontally scrollable on mobile with a swipe-fade hint,
          touch-friendly 44px tap targets. */}
      <div className="relative -mx-4 sm:mx-0 mb-5 sm:mb-6 border-b border-[color:var(--dg-border)]">
        <div className="flex items-stretch gap-1 overflow-x-auto scrollbar-hide scroll-smooth px-4 sm:px-0">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            const href =
              tab.key === "all"
                ? `?`
                : `?filter=${tab.key}`;
            return (
              <a
                key={tab.key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3.5 sm:px-3 min-h-[44px] sm:min-h-0 sm:py-2 font-mono text-[12px] sm:text-[11px] uppercase tracking-wider border-b-2 transition -mb-px ${
                  isActive
                    ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)]"
                    : "border-transparent text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] active:text-[color:var(--dg-fg)]"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded px-1 font-mono text-[10px] tabular-nums ${
                      isActive
                        ? "bg-[color:var(--dg-electric)]/15 text-[color:var(--dg-fg)]"
                        : "bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-subtle)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </a>
            );
          })}
        </div>
        {/* Right-edge fade: signals the tab row scrolls horizontally on mobile */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[color:var(--dg-canvas)] to-transparent sm:hidden"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-allowed">● {t("incidents.noActive")}</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("incidents.noTitle")}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed">
            {t("incidents.noActiveDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((inc: any) => (
            <Link
              key={inc.id}
              href={`/dashboard/${installationId}/incidents/${inc.id}`}
              className="flex items-start gap-3 sm:gap-4 px-4 py-4 sm:py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              {/* Status dot */}
              <div className="mt-1.5 sm:mt-2 shrink-0">
                <span
                  className={`h-2 w-2 rounded-full inline-block ${STATUS_DOT[inc.status] ?? "bg-[color:var(--dg-fg-subtle)]"}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start gap-2 flex-wrap mb-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest shrink-0 ${SEV[inc.severity] ?? ""}`}
                  >
                    {inc.severity}
                  </span>
                  <span className="font-sans text-[14px] sm:text-[13px] font-medium leading-snug text-[color:var(--dg-fg)] break-words min-w-0">
                    {inc.title}
                  </span>
                </div>

                {/* Description */}
                {inc.description && (
                  <p className="text-[13px] sm:text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-2.5 line-clamp-3 sm:line-clamp-2 break-words">
                    {inc.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest shrink-0 ${STATUS_BADGE[inc.status] ?? ""}`}
                  >
                    {inc.status}
                  </span>
                  {inc.recurrence_count > 1 && (
                    <span className="font-mono text-[11px] sm:text-[10px] text-warned shrink-0">
                      {t("incidents.recurrenceBadge")?.replace("{n}", String(inc.recurrence_count)) ?? `↺ ${inc.recurrence_count}× recurrence`}
                    </span>
                  )}
                  {inc.last_seen_at && (
                    <span className="font-mono text-[11px] sm:text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
                      {formatDate(inc.last_seen_at, preferences.locale)}
                    </span>
                  )}
                </div>

                {/* Suggested fix */}
                {inc.suggested_fix && (
                  <div className="mt-3 rounded border border-allowed/20 bg-allowed/5 px-3 py-2.5">
                    <span className="block sm:inline font-mono text-[10px] uppercase tracking-widest text-allowed mb-1 sm:mb-0 sm:mr-2">
                      Suggested fix:
                    </span>
                    <span className="font-mono text-[12px] sm:text-[11px] leading-relaxed text-allowed break-words [overflow-wrap:anywhere]">
                      {inc.suggested_fix}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
