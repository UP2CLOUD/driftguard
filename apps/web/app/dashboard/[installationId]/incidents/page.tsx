import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const API   = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HDRS  = () => ({ Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` });

async function fetchIncidents(id: string, status?: string) {
  try {
    const q = status ? `&status=${status}` : "";
    const res = await fetch(`${API()}/api/v1/incidents?installation_id=${id}&limit=50${q}`, {
      headers: HDRS(), next: { revalidate: 15 }, signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const SEV: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/5",
  high:     "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/5",
  medium:   "text-warned border-warned/30 bg-warned/5",
  low:      "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)]",
};
const STATUS_DOT: Record<string, string> = {
  open: "bg-blocked", investigating: "bg-warned", resolved: "bg-allowed", suppressed: "bg-[color:var(--dg-fg-subtle)]",
};

export default async function IncidentsPage({ params }: { params: Promise<{ installationId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const [open, resolved] = await Promise.all([
    fetchIncidents(installationId, "open"),
    fetchIncidents(installationId, "resolved"),
  ]);
  const investigating = await fetchIncidents(installationId, "investigating");
  const all = [...open, ...investigating, ...resolved];

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="dg-label mb-2">Drift incidents</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          Incidents
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {open.length} open · {investigating.length} investigating · {resolved.length} resolved
        </p>
      </div>

      {all.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
          <div className="text-[13px] text-[color:var(--dg-fg-muted)]">No incidents yet.</div>
          <p className="mt-2 text-[11px] text-[color:var(--dg-fg-subtle)]">
            Incidents are created automatically when DriftGuard detects high or critical events.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {all.map((inc: any) => (
            <div key={inc.id} className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              <div className="mt-1.5 shrink-0">
                <span className={`h-2 w-2 rounded-full inline-block ${STATUS_DOT[inc.status] ?? "bg-[color:var(--dg-fg-subtle)]"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${SEV[inc.severity] ?? ""}`}>
                    {inc.severity}
                  </span>
                  <span className="text-[13px] font-medium text-[color:var(--dg-fg)] truncate">{inc.title}</span>
                </div>
                {inc.description && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] truncate">{inc.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-4 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                  <span className="capitalize">{inc.status}</span>
                  {inc.recurrence_count > 1 && (
                    <span className="text-warned">↺ {inc.recurrence_count}× recurrence</span>
                  )}
                  {inc.last_seen_at && <span>{new Date(inc.last_seen_at).toLocaleString()}</span>}
                </div>
                {inc.suggested_fix && (
                  <div className="mt-2 rounded border border-allowed/20 bg-allowed/5 px-3 py-1.5 font-mono text-[10px] text-allowed">
                    Fix: {inc.suggested_fix}
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
