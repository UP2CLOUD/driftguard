import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import { IncidentsListClient, type Incident } from "./IncidentsListClient";

async function fetchIncidents(id: string, status?: string) {
  const q = status ? `&status=${status}` : "";
  return (
    (await beGet<Incident[]>(
      `/api/v1/incidents?installation_id=${id}&limit=50${q}`,
      { revalidate: 15, timeout: 3000 },
    )) ?? []
  );
}


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
                    className={`rounded px-1 font-sans font-medium text-[10px] tabular-nums ${
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
          <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-allowed">● {t("incidents.noActive")}</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("incidents.noTitle")}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed">
            {t("incidents.noActiveDesc")}
          </p>
        </div>
      ) : (
        <IncidentsListClient
          incidents={filtered}
          installationId={installationId}
          locale={preferences.locale}
          labels={{
            sevAll: t("incidents.sevAll"),
            sevCritical: t("incidents.sevCritical"),
            sevHigh: t("incidents.sevHigh"),
            sevMedium: t("incidents.sevMedium"),
            sevLow: t("incidents.sevLow"),
            noMatch: t("incidents.noMatchFilter"),
            suggestedFixInline: t("incidents.suggestedFixInline"),
            recurrenceBadge: t("incidents.recurrenceBadge"),
          }}
        />
      )}
    </div>
  );
}
