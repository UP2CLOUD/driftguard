import { auth } from "@/auth";
import { redirect } from "next/navigation";

const API  = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HDRS = () => ({ Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` });

async function fetchPolicies(id: string) {
  try {
    const res = await fetch(`${API()}/api/v1/policies?installation_id=${id}`, {
      headers: HDRS(), next: { revalidate: 30 }, signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const TYPE_STYLE: Record<string, string> = {
  block: "text-blocked border-blocked/30 bg-blocked/5",
  warn:  "text-warned border-warned/30 bg-warned/5",
  alert: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
};

export default async function PoliciesPage({ params }: { params: Promise<{ installationId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;
  const policies = await fetchPolicies(installationId);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="dg-label mb-2">Runtime guardrails</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">Policy rules</h1>
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
            {policies.filter((p: any) => p.enabled).length} active · {policies.length} total
          </p>
        </div>
        <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          Use POST /api/v1/policies to add rules
        </div>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">No policies yet.</p>
          <p className="mt-2 text-[11px] text-[color:var(--dg-fg-subtle)]">
            Run the seed script to create default policy templates.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {policies.map((p: any) => (
            <div key={p.id} className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              <div className="mt-0.5 shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full inline-block ${p.enabled ? "bg-allowed" : "bg-[color:var(--dg-fg-subtle)]"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${TYPE_STYLE[p.rule_type] ?? ""}`}>
                    {p.rule_type}
                  </span>
                  <span className="text-[13px] font-medium text-[color:var(--dg-fg)]">{p.name}</span>
                  {!p.enabled && (
                    <span className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)]">disabled</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{p.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-4 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                  {p.conditions && <span>if {JSON.stringify(p.conditions)}</span>}
                  {p.match_count > 0 && <span className="text-warned">{p.match_count} matches</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
