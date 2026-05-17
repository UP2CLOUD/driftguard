import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { formatCents, getOrg, listAnalyses, listRepos } from "@/lib/api";

export default async function Dashboard({ params }: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await params;

  let org;
  try {
    org = await getOrg(installationId);
  } catch {
    return (
      <main className="min-h-screen bg-paper flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
        <DashboardNav installationId={installationId} />
        <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div className="max-w-md w-full bg-white/70 border border-ink/10 rounded-3xl p-8 shadow-xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mt-4">Installation Not Found</h1>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              We don&apos;t have a record of this GitHub App installation yet. Install Driftguard
              on your repository to initiate security reviews.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const [repos, analyses] = await Promise.all([
    listRepos(org.id),
    listAnalyses(org.id, 10),
  ]);

  const totalRepos = repos.length;
  const activeRepos = repos.filter(r => r.enabled).length;
  const totalAnalyses = analyses.length;
  
  const totalCostDeltaCents = analyses.reduce((sum, item) => sum + (item.cost_delta_cents || 0), 0);
  
  const avgRisk = analyses.length > 0
    ? Math.round(analyses.reduce((sum, item) => sum + (item.risk_score || 0), 0) / analyses.length)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <DashboardNav installationId={installationId} planLabel={org.plan} />

      <div className="mx-auto max-w-7xl px-[var(--dg-space-page-x)] py-[var(--dg-space-page-y)]">
        {/* Dynamic Metric Overview Row */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Connected Repos"
            value={totalRepos}
            badge={`${activeRepos} active`}
            badgeColor="emerald"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              </svg>
            }
          />
          <StatCard
            label="Analyses Run"
            value={totalAnalyses}
            subtext="reviews run"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            }
          />
          <StatCard
            label="Total Cost Delta"
            value={formatCents(totalCostDeltaCents)}
            subtext="all pull requests"
            valueColor={totalCostDeltaCents > 0 ? "amber" : totalCostDeltaCents < 0 ? "emerald" : "default"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
          <StatCard
            label="Avg Risk Score"
            value={`${avgRisk}/100`}
            subtext="security rating"
            valueColor={avgRisk > 70 ? "red" : avgRisk > 30 ? "amber" : "emerald"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
          />
        </section>

        {/* Repositories Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-orange-500 rounded-sm" />
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Connected Repositories</h2>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {totalRepos} Total
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {repos.length === 0 ? (
              <div className="col-span-full border border-dashed border-zinc-800 rounded-lg p-8 text-center bg-zinc-900/30">
                <p className="text-sm text-zinc-400">
                  No repositories connected. Complete the setup by installing Driftguard on a repo with OpenTofu / Terraform code.
                </p>
              </div>
            ) : (
              repos.map((r) => (
                <div
                  key={r.id}
                  className={`group relative rounded-lg border p-4 transition-colors duration-150 ${
                    r.enabled
                      ? "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                      : "border-zinc-900 bg-zinc-950 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:bg-orange-500/10 group-hover:text-orange-400 group-hover:border-orange-500/20 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors">
                          {r.full_name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400 font-mono">
                          <span>branch: <span className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">{r.default_branch}</span></span>
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      r.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-transparent"
                    }`}>
                      {r.enabled && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>}
                      {r.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Analyses Section */}
        <section>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-orange-500 rounded-sm" />
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Recent PR Analyses</h2>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Latest Reviews
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-wider font-mono text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Repository</th>
                    <th className="px-4 py-3">Pull Request</th>
                    <th className="px-4 py-3">Commit SHA</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Cost Delta</th>
                    <th className="px-4 py-3 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {analyses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                        No analyses run yet. Open a Pull Request with infrastructure changes to trigger Driftguard.
                      </td>
                    </tr>
                  ) : (
                    analyses.map((a) => (
                      <tr
                        key={a.id}
                        className="group cursor-pointer hover:bg-zinc-900/60 transition-colors duration-150"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs text-zinc-300 group-hover:text-orange-400 font-semibold transition-colors">
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block">
                            {a.repo}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-zinc-200">
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block flex items-center gap-1 group-hover:text-orange-400 transition-colors">
                            #{a.pr_number}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-zinc-500">
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block">
                            <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 font-semibold text-zinc-300">
                              {a.head_sha.slice(0, 7)}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                              a.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : a.status === "failed"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                a.status === "completed"
                                  ? "bg-emerald-500"
                                  : a.status === "failed"
                                  ? "bg-red-500"
                                  : "bg-blue-500 animate-pulse"
                              }`}></span>
                              {a.status}
                            </span>
                          </Link>
                        </td>
                        <td className={`px-4 py-3.5 font-mono text-xs font-bold ${
                          (a.cost_delta_cents || 0) > 0
                            ? "text-amber-500"
                            : (a.cost_delta_cents || 0) < 0
                            ? "text-emerald-400"
                            : "text-zinc-500"
                        }`}>
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block">
                            {formatCents(a.cost_delta_cents)}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/dashboard/${installationId}/analyses/${a.id}`} className="block">
                            <span className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                              (a.risk_score || 0) > 70
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : (a.risk_score || 0) > 30
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              {a.risk_score ?? 0}/100
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  subtext,
  badge,
  badgeColor = "emerald",
  valueColor = "default",
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeColor?: "emerald" | "amber" | "red";
  valueColor?: "default" | "emerald" | "amber" | "red";
  icon?: React.ReactNode;
}) {
  const valueColorClasses = {
    default: "text-zinc-100",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  const badgeColorClasses = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-sm hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-150 relative overflow-hidden group">
      {/* Top Row: Label and Icon */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{label}</div>
        {icon && (
          <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:bg-orange-500/10 group-hover:text-orange-400 group-hover:border-orange-500/20 transition-all duration-150 shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Bottom Stack: Value, Badge and Subtext */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-2xl font-extrabold tracking-tight ${valueColorClasses[valueColor]}`}>
            {value}
          </span>
          {badge && (
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${badgeColorClasses[badgeColor]}`}>
              <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
              {badge}
            </span>
          )}
        </div>
        {subtext && <div className="mt-1 text-xs text-zinc-400 font-sans font-medium">{subtext}</div>}
      </div>
    </div>
  );
}
