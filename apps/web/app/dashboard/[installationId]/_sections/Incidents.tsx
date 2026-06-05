import { getIncidents, getOverview } from "./api";
import { formatDateTime } from "@/lib/format-date";

type T = (key: string) => string | null | undefined;

const SEV_COLOR: Record<string, string> = {
  critical: "text-blocked",
  high: "text-[color:var(--dg-severity-high)]",
  medium: "text-warned",
  low: "text-[color:var(--dg-fg-muted)]",
};

const STATUS_DOT: Record<string, string> = {
  open: "bg-blocked",
  investigating: "bg-warned",
  resolved: "bg-allowed",
  suppressed: "bg-[color:var(--dg-fg-subtle)]",
};

export async function IncidentsSection({
  installationId,
  t,
  locale,
}: {
  installationId: string;
  t: T;
  locale: string;
}) {
  const [incidents, overview] = await Promise.all([
    getIncidents(installationId),
    getOverview(installationId),
  ]);
  const openInc = overview?.open_incidents ?? 0;

  if (!incidents || incidents.length === 0) return null;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.driftIncidents") ?? "Drift incidents"}
        </span>
        <span className="font-mono text-[10px] rounded border border-blocked/30 bg-blocked/10 text-blocked px-1.5 py-0.5">
          {openInc} open
        </span>
      </div>
      <div className="divide-y divide-[color:var(--dg-border)]">
        {incidents.map((inc: any) => (
          <div key={inc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition">
            <div className="mt-1.5 shrink-0">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[inc.status] ?? "bg-[color:var(--dg-fg-subtle)]"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`font-mono text-[10px] uppercase tracking-widest ${SEV_COLOR[inc.severity] ?? ""}`}>
                  {inc.severity}
                </span>
                <span className="text-[12px] font-medium text-[color:var(--dg-fg)] truncate">{inc.title}</span>
              </div>
              <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] flex items-center gap-3">
                <span>{inc.status}</span>
                {inc.recurrence_count > 1 && (
                  <span className="text-warned">↺ {inc.recurrence_count}×</span>
                )}
                {inc.last_seen_at && (
                  <span>{formatDateTime(inc.last_seen_at, locale)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
