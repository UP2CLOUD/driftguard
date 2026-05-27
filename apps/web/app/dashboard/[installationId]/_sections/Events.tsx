import { getEvents, getOverview } from "./api";

type T = (key: string) => string | null | undefined;

export async function EventsSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const [events, overview] = await Promise.all([
    getEvents(installationId),
    getOverview(installationId),
  ]);
  const apiAvailable = !!overview;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden h-fit">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.eventFeed") ?? "Event feed"}
        </span>
        {apiAvailable && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed animate-pulse" />
            <span className="font-mono text-[10px] text-allowed">live</span>
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
            return (
              <div key={e.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
                  <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                    {e.event_type} · {e.source}
                  </span>
                </div>
                <p className={`text-[11px] truncate ${txtCls}`}>{e.message}</p>
                {e.created_at && (
                  <p className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-[12px] text-[color:var(--dg-fg-muted)]">
          {t("dashboard.noEvents") ?? "No events yet."}
        </div>
      )}
    </div>
  );
}
