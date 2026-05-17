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
      <main className="min-h-screen">
        <DashboardNav installationId={installationId} />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Installation not found</h1>
          <p className="mt-2 text-muted">
            We don&apos;t have a record of this GitHub App installation yet. Install Driftguard
            on your repo and try again.
          </p>
        </div>
      </main>
    );
  }

  const [repos, analyses] = await Promise.all([
    listRepos(org.id),
    listAnalyses(org.id, 10),
  ]);

  return (
    <main className="min-h-screen">
      <DashboardNav installationId={installationId} planLabel={org.plan} />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <section className="mb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Repositories</h2>
            <span className="text-sm text-muted">{repos.length} connected</span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {repos.length === 0 && (
              <p className="col-span-full text-muted">
                No repos yet. Install Driftguard on a repo with OpenTofu or Terraform code.
              </p>
            )}
            {repos.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-4 ${
                  r.enabled ? "border-ink/15 bg-white/40" : "border-ink/5 bg-ink/5 opacity-60"
                }`}
              >
                <div className="font-mono text-sm">{r.full_name}</div>
                <div className="mt-1 text-xs text-muted">
                  branch: {r.default_branch} · {r.enabled ? "active" : "disabled"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Recent analyses</h2>
          </div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-left text-xs uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-4 py-3">Repo</th>
                  <th className="px-4 py-3">PR</th>
                  <th className="px-4 py-3">SHA</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cost Δ</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {analyses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      No analyses yet. Open a PR with Terraform changes to trigger one.
                    </td>
                  </tr>
                )}
                {analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-ink/5">
                    <td className="px-4 py-3 font-mono text-xs">{a.repo}</td>
                    <td className="px-4 py-3">#{a.pr_number}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.head_sha.slice(0, 7)}</td>
                    <td className="px-4 py-3">{a.status}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCents(a.cost_delta_cents)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/${installationId}/analyses/${a.id}`}
                        className="text-accent hover:underline"
                      >
                        {a.risk_score ?? 0} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
