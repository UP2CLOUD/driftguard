import Link from "next/link";
import { getOverview } from "./api";
import { fetchInstallationRepos } from "@/lib/github-installation";

type T = (key: string) => string | null | undefined;

export async function RecentAnalysesSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const overview = await getOverview(installationId);
  const apiAvailable = !!overview;
  const analyses7d = overview?.analyses_7d ?? 0;
  const recentAnalyses = overview?.recent_analyses ?? [];

  let ghRepos: Array<{ full_name: string; html_url: string; default_branch: string }> = [];
  if (!apiAvailable) {
    const raw = await fetchInstallationRepos(installationId);
    ghRepos = raw.map((r) => ({
      full_name: r.full_name,
      html_url: r.html_url,
      default_branch: r.default_branch,
    }));
  }

  return (
    <>
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
            {t("dashboard.noAnalyses") ?? "No analyses yet."}
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

      {!apiAvailable && ghRepos.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              Repositories (GitHub)
            </span>
          </div>
          <div className="divide-y divide-[color:var(--dg-border)]">
            {ghRepos.map((r) => (
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
    </>
  );
}
