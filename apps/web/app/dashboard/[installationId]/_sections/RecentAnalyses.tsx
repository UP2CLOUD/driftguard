import Link from "next/link";
import { getOverview } from "./api";
import { fetchInstallationRepos } from "@/lib/github-installation";
import { formatDateTime } from "@/lib/format-date";

type T = (key: string) => string | null | undefined;

export async function RecentAnalysesSection({
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
  const overview = demoOverview ?? await getOverview(installationId);
  const apiAvailable = !!overview;
  const analyses7d = overview?.analyses_7d ?? 0;
  const recentAnalyses = demoOverview?.recent_analyses ?? overview?.recent_analyses ?? [];

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
          <div className="px-6 py-10 text-center">
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
              No PR analyses yet
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto mb-5 leading-relaxed">
              DriftGuard reviews Terraform pull requests for security, cost, and reliability drift. Connect a repository to begin.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews"}/installations/new`}
                className="rounded bg-[color:var(--dg-electric)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white hover:brightness-110 transition"
              >
                Connect GitHub →
              </a>
              <a
                href="/docs/install"
                className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition"
              >
                Setup guide
              </a>
            </div>
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
              No PR analyses yet
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed">
              Open a Terraform or OpenTofu pull request in a connected repository to trigger the first analysis.
            </p>
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
                    {formatDateTime(a.created_at, locale)}
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
