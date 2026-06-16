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
          <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("repos.recentAnalyses") ?? "Recent analyses"}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">{analyses7d} / 7d</span>
            {recentAnalyses.length > 0 && (
              <Link
                href={`/dashboard/${installationId}/analyses`}
                className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
              >
                View all →
              </Link>
            )}
          </div>
        </div>
        {recentAnalyses.length === 0 && !apiAvailable ? (
          <div className="px-6 py-10 text-center">
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
              {t("dashboard.noAnalysesTitle") ?? "No PR analyses yet"}
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto mb-5 leading-relaxed">
              {t("dashboard.noAnalysesConnectDesc") ?? "DriftGuard reviews Terraform pull requests for security, cost, and reliability drift. Connect a repository to begin."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews"}/installations/new`}
                className="rounded bg-[color:var(--dg-electric)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-white hover:brightness-110 transition"
              >
                {t("dashboard.connectGithubCta") ?? "Connect GitHub →"}
              </a>
              <a
                href="/docs/install"
                className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition"
              >
                {t("dashboard.setupGuide") ?? "Setup guide"}
              </a>
            </div>
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="px-6 py-10">
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-1 text-center">
              {t("dashboard.noAnalysesTitle") ?? "No PR analyses yet"}
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed text-center mb-8">
              {t("dashboard.noAnalysesOpenPrDesc") ?? "Open a Terraform or OpenTofu pull request in a connected repository to trigger the first analysis."}
            </p>
            {/* First-PR guide */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] text-center mb-4">
                {t("dashboard.firstPrGuideTitle") ?? "What happens when you open a PR"}
              </div>
              {[
                { step: "1", label: t("dashboard.firstPrStep1") ?? "Push a branch with *.tf file changes" },
                { step: "2", label: t("dashboard.firstPrStep2") ?? "Open a pull request on GitHub" },
                { step: "3", label: t("dashboard.firstPrStep3") ?? "DriftGuard scans for security, cost & policy violations" },
                { step: "4", label: t("dashboard.firstPrStep4") ?? "Results appear as a PR comment and here in the dashboard" },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="shrink-0 h-5 w-5 rounded-full border border-[color:var(--dg-border)] font-sans font-medium text-[10px] flex items-center justify-center text-[color:var(--dg-fg-subtle)]">
                    {step}
                  </span>
                  <span className="text-[12px] text-[color:var(--dg-fg-muted)] pt-0.5 leading-relaxed">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/docs/install"
                className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
              >
                {t("dashboard.setupGuide") ?? "Setup guide"} →
              </Link>
            </div>
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
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] hidden sm:inline">
                      {a.head_sha?.slice(0, 7)}
                    </span>
                  </div>
                  <div className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {formatDateTime(a.created_at, locale)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.policy_verdict && a.policy_verdict !== "pass" && (
                    <span className={`font-sans font-medium text-[9px] uppercase tracking-widest rounded px-1 py-0.5 ${
                      a.policy_verdict === "block" ? "text-blocked bg-blocked/10" : "text-warned bg-warned/10"
                    }`}>
                      {a.policy_verdict}
                    </span>
                  )}
                  <span className={`font-mono text-[13px] font-bold tabular-nums ${
                    (a.risk_score ?? 0) >= 70 ? "text-blocked" :
                    (a.risk_score ?? 0) >= 40 ? "text-warned" : "text-allowed"
                  }`}>
                    {a.risk_score ?? "—"}
                  </span>
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!apiAvailable && ghRepos.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {t("dashboard.ghReposTitle") ?? "Repositories (GitHub)"}
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
                <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">{r.default_branch}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
