import { auth } from "@/auth";
import { redirect } from "next/navigation";

const API  = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HDRS = () => ({ Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` });

async function fetchMemory(id: string) {
  try {
    const [listRes, statsRes] = await Promise.all([
      fetch(`${API()}/api/v1/memory?installation_id=${id}&limit=20`, {
        headers: HDRS(), next: { revalidate: 30 }, signal: AbortSignal.timeout(3000),
      }),
      fetch(`${API()}/api/v1/memory/stats?installation_id=${id}`, {
        headers: HDRS(), next: { revalidate: 30 }, signal: AbortSignal.timeout(3000),
      }),
    ]);
    const entries = listRes.ok ? await listRes.json() : [];
    const stats   = statsRes.ok ? await statsRes.json() : { total: 0, by_outcome: {}, by_severity: {} };
    return { entries, stats };
  } catch { return { entries: [], stats: { total: 0, by_outcome: {}, by_severity: {} } }; }
}

const OUT_STYLE: Record<string, string> = {
  blocked:  "text-blocked",
  approved: "text-allowed",
  warned:   "text-warned",
};

export default async function MemoryPage({ params }: { params: Promise<{ installationId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;
  const { entries, stats } = await fetchMemory(installationId);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="dg-label mb-2">Semantic memory</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          Operational memory
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {stats.total} indexed incidents · used for similarity recall on every PR
        </p>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-6">
          <div className="bg-[color:var(--dg-canvas)] px-4 py-4">
            <div className="dg-label mb-1">Total</div>
            <div className="font-mono text-2xl font-bold text-[color:var(--dg-fg)]">{stats.total}</div>
          </div>
          {Object.entries(stats.by_outcome as Record<string, number>).map(([k, v]) => (
            <div key={k} className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="dg-label mb-1 capitalize">{k}</div>
              <div className={`font-mono text-2xl font-bold ${OUT_STYLE[k] ?? "text-[color:var(--dg-fg)]"}`}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">No memory entries yet.</p>
          <p className="mt-2 text-[11px] text-[color:var(--dg-fg-subtle)]">
            Memory is built as DriftGuard reviews PRs and records incident embeddings.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-start gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">
                    {e.repo_full_name}#{e.pr_number}
                  </code>
                  {e.outcome && (
                    <span className={`font-mono text-[10px] uppercase ${OUT_STYLE[e.outcome] ?? "text-[color:var(--dg-fg-subtle)]"}`}>
                      {e.outcome}
                    </span>
                  )}
                  {e.severity && (
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{e.severity}</span>
                  )}
                </div>
                {e.intent_text && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] truncate">{e.intent_text}</p>
                )}
                {e.created_at && (
                  <p className="mt-0.5 font-mono text-[9px] text-[color:var(--dg-fg-subtle)]">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
