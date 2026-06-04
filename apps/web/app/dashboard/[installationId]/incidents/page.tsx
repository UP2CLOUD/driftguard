import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
    { key: "all", label: "All", count: allIncidents.length },
    { key: "open", label: "Open", count: open.length },
    { key: "investigating", label: "Investigating", count: investigating.length },
    { key: "resolved", label: "Resolved", count: resolved.length },
  ];

  const activeTab = filter ?? "all";

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="dg-label mb-2">{t("incidents.eyebrow") ?? "Drift monitoring"}</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("incidents.title") ?? "Incidents"}
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 mb-6 border-b border-[color:var(--dg-border)]">
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
              className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider border-b-2 transition -mb-px ${
                isActive
                  ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)]"
                  : "border-transparent text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)]"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`rounded px-1 font-mono text-[9px] ${
                    isActive
                      ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)]"
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

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-allowed">● No active incidents</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("incidents.noTitle") ?? "No incidents detected"}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed">
            DriftGuard automatically creates incidents when repeated drift patterns or critical findings are detected across pull requests.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((inc: any) => (
            <div
              key={inc.id}
              className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              {/* Status dot */}
              <div className="mt-2 shrink-0">
                <span
                  className={`h-2 w-2 rounded-full inline-block ${STATUS_DOT[inc.status] ?? "bg-[color:var(--dg-fg-subtle)]"}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest shrink-0 ${SEV[inc.severity] ?? ""}`}
                  >
                    {inc.severity}
                  </span>
                  <span className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)] truncate">
                    {inc.title}
                  </span>
                </div>

                {/* Description */}
                {inc.description && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-2 line-clamp-2">
                    {inc.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_BADGE[inc.status] ?? ""}`}
                  >
                    {inc.status}
                  </span>
                  {inc.recurrence_count > 1 && (
                    <span className="font-mono text-[10px] text-warned">
                      ↺ {inc.recurrence_count}× recurrence
                    </span>
                  )}
                  {inc.last_seen_at && (
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                      {formatDate(inc.last_seen_at, preferences.locale)}
                    </span>
                  )}
                </div>

                {/* Suggested fix */}
                {inc.suggested_fix && (
                  <div className="mt-3 rounded border border-allowed/20 bg-allowed/5 px-3 py-2">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-allowed mr-2">
                      Suggested fix:
                    </span>
                    <span className="font-mono text-[11px] text-allowed">{inc.suggested_fix}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
