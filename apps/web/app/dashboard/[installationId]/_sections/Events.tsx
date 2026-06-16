import Link from "next/link";
import { getEvents, getOverview } from "./api";
import { formatTime } from "@/lib/format-date";

type T = (key: string) => string | null | undefined;

export async function EventsSection({
  installationId,
  t,
  locale,
  demoOverview,
}: {
  installationId: string;
  t: T;
  locale: string;
  demoOverview?: any;
}) {
  const [events, overview] = demoOverview
    ? [demoOverview.recent_events, demoOverview]
    : await Promise.all([getEvents(installationId), getOverview(installationId)]);
  const apiAvailable = !!overview;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden h-fit">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.eventFeed") ?? "Event feed"}
        </span>
        {apiAvailable && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed animate-pulse" aria-hidden="true" />
            <span className="font-sans font-medium text-[10px] text-allowed">live</span>
          </span>
        )}
      </div>
      {events && events.length > 0 ? (
        <div className="divide-y divide-[color:var(--dg-border)]">
          {events.map((e: any) => {
            const sev = e.severity ?? "info";
            const dotCls =
              sev === "critical" ? "bg-blocked shadow-[0_0_4px_rgba(255,71,87,0.5)]" :
              sev === "high" ? "bg-[color:var(--dg-severity-high)]" :
              sev === "warn" ? "bg-warned" : "bg-[color:var(--dg-electric)]";
            const txtCls =
              sev === "critical" ? "text-blocked" :
              sev === "high" ? "text-[color:var(--dg-severity-high)]" :
              sev === "warn" ? "text-warned" : "text-[color:var(--dg-fg-muted)]";
            const inner = (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`}
                    aria-label={`Severity: ${sev}`}
                  />
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                    {e.event_type} · {e.source}
                  </span>
                </div>
                <p className={`text-[11px] truncate ${txtCls}`}>{e.message}</p>
                {e.created_at && (
                  <p className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {formatTime(e.created_at, locale)}
                  </p>
                )}
              </>
            );
            return e.analysis_id ? (
              <Link
                key={e.id}
                href={`/dashboard/${installationId}/analyses/${e.analysis_id}`}
                className="block px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition"
              >
                {inner}
              </Link>
            ) : (
              <div key={e.id} className="px-4 py-3">
                {inner}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-[12px] font-medium text-[color:var(--dg-fg-muted)] mb-1">{t("dashboard.noEventsTitle") ?? "No events yet"}</p>
          <p className="text-[11px] text-[color:var(--dg-fg-subtle)] leading-relaxed max-w-[200px] mx-auto">
            {t("dashboard.noEventsDesc") ?? "Events from connected repositories will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
