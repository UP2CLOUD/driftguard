import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { fetchInstallationRepos } from "@/lib/github-installation";

const API   = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN = () => `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}`;
const HDRS  = () => ({ Authorization: TOKEN() });

async function apiFetch(path: string, revalidate = 20) {
  try {
    const res = await fetch(`${API()}${path}`, {
      headers: HDRS(),
      next: { revalidate },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  // Parallel fetch: overview + incidents + events
  const [overview, incidents, events] = await Promise.all([
    apiFetch(`/api/v1/dashboard/overview?installation_id=${installationId}`),
    apiFetch(`/api/v1/incidents?installation_id=${installationId}&limit=5`),
    apiFetch(`/api/v1/events?installation_id=${installationId}&limit=8`),
  ]);

  const apiAvailable = !!overview;
  const orgPlan      = overview?.plan ?? "free";
  const repos        = overview?.repos ?? 0;
  const analyses7d   = overview?.analyses_7d ?? 0;
  const avgRisk      = overview?.avg_risk_7d ?? null;
  const openInc      = overview?.open_incidents ?? 0;
  const criticalInc  = overview?.critical_incidents ?? 0;
  const memoryCount  = overview?.memory_entries ?? 0;
  const recentAnalyses = overview?.recent_analyses ?? [];

  // GitHub fallback for repos list when API offline
  let ghRepos: any[] = [];
  if (!apiAvailable) {
    const raw = await fetchInstallationRepos(installationId);
    ghRepos = raw.map((r) => ({
      full_name: r.full_name,
      html_url: r.html_url,
      default_branch: r.default_branch,
    }));
  }

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

  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
            <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="font-sans text-[14px] font-semibold tracking-tight">driftguard</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hidden sm:inline">
            {orgPlan} plan
          </span>
          {!apiAvailable && (
            <span className="font-mono text-[10px] text-warned bg-warned/10 border border-warned/20 rounded px-2 py-1">
              API offline — limited data
            </span>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-8">

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
          {[
            { label: t("repos.statsRepos") ?? "Repos", value: repos, color: "" },
            { label: t("repos.statsAnalyses") ?? "Analyses 7d", value: analyses7d, color: "" },
            { label: "Avg risk", value: avgRisk != null ? `${avgRisk}` : "—", color: "" },
            { label: "Open incidents", value: openInc, color: openInc > 0 ? "text-blocked" : "" },
            { label: "Critical", value: criticalInc, color: criticalInc > 0 ? "text-blocked" : "" },
            { label: "Memory", value: memoryCount, color: "" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">{label}</div>
              <div className={`font-mono text-xl font-bold tabular-nums ${color || "text-[color:var(--dg-fg)]"}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Analyses + Incidents */}
          <div className="space-y-6">

            {/* Recent analyses */}
            <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                  {t("repos.recentAnalyses") ?? "Recent analyses"}
                </span>
                <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{analyses7d} / 7d</span>
              </div>
              {recentAnalyses.length === 0 && !apiAvailable ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] text-[color:var(--dg-fg-muted)] mb-4">
                    {t("repos.noReposBody") ?? "Open a Terraform PR to trigger your first analysis."}
                  </p>
                  <a
                    href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-app"}/installations/new`}
                    className="dg-button dg-button-ghost text-[11px]"
                  >
                    {t("repos.addRepository") ?? "Add repository →"}
                  </a>
                </div>
              ) : recentAnalyses.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-[color:var(--dg-fg-muted)]">
                  No analyses yet — open a Terraform PR to start.
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--dg-border)]">
                  {recentAnalyses.map((a: any) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/${installationId}/analyses/${a.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <code className="font-mono text-[11px] text-[color:var(--dg-fg)] truncate">
                            {a.repo_full_name}#{a.pr_number}
                          </code>
                          <span className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)] hidden sm:inline">
                            {a.head_sha?.slice(0, 7)}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                          {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono text-[13px] font-bold tabular-nums ${
                          (a.risk_score ?? 0) >= 70 ? "text-blocked" :
                          (a.risk_score ?? 0) >= 40 ? "text-warned" : "text-allowed"
                        }`}>
                          {a.risk_score ?? "—"}
                        </span>
                        <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] opacity-0 group-hover:opacity-100 transition">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Incidents */}
            {incidents && incidents.length > 0 && (
              <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                    Drift incidents
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
                            <span>{new Date(inc.last_seen_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub repos fallback */}
            {!apiAvailable && ghRepos.length > 0 && (
              <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
                <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                    Repositories (GitHub)
                  </span>
                </div>
                <div className="divide-y divide-[color:var(--dg-border)]">
                  {ghRepos.map((r: any) => (
                    <a
                      key={r.full_name}
                      href={r.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition"
                    >
                      <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">{r.full_name}</code>
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{r.default_branch}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: event feed */}
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden h-fit">
            <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                Event feed
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
                    sev === "high"     ? "bg-[color:var(--dg-severity-high)]" :
                    sev === "warn"     ? "bg-warned" : "bg-[color:var(--dg-electric)]";
                  const txtCls =
                    sev === "critical" ? "text-blocked" :
                    sev === "high"     ? "text-[color:var(--dg-severity-high)]" :
                    sev === "warn"     ? "text-warned" : "text-[color:var(--dg-fg-muted)]";
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
                No events yet — events appear here as DriftGuard reviews PRs.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
