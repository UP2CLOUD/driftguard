import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

export default async function RepoList({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  // Fetch repos from API (server-side, cached)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let repos: any[] = [];
  let lastAnalyses: any[] = [];
  let orgPlan = "free";

  try {
    const orgRes = await fetch(`${apiUrl}/api/v1/orgs/by-installation/${installationId}`, {
      headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
      next: { revalidate: 30 },
    });
    if (orgRes.ok) {
      const org = await orgRes.json();
      orgPlan = org.plan;
      const [reposRes, analysesRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/orgs/${org.id}/repos`, {
          headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
          next: { revalidate: 30 },
        }),
        fetch(`${apiUrl}/api/v1/orgs/${org.id}/analyses?limit=5`, {
          headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
          next: { revalidate: 30 },
        }),
      ]);
      if (reposRes.ok) repos = await reposRes.json();
      if (analysesRes.ok) lastAnalyses = await analysesRes.json();
    }
  } catch {
    // API not reachable
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="dg-label">Workspace ▸ {installationId}</div>
          <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("repos.title")}
          </h1>
        </div>
        <a
          href="https://github.com/apps/driftguard-app/installations/new"
          className="dg-button dg-button-ghost text-[12px]"
        >
          {t("repos.addRepo")}
        </a>
      </div>

      {/* Stats strip */}
      <div className="mb-8 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] grid-cols-2 sm:grid-cols-4">
        <StatCell label={t("repos.statsRepos")} value={repos.length} />
        <StatCell label={t("repos.statsAnalyses")} value={lastAnalyses.length} />
        <StatCell label={t("repos.statsAvgRisk")} value={lastAnalyses.length ? Math.round(lastAnalyses.reduce((s, a) => s + (a.risk_score || 0), 0) / lastAnalyses.length) : "—"} />
        <StatCell label={t("repos.statsPlan")} value={orgPlan} accent={orgPlan !== "free"} />
      </div>

      {/* Repo list */}
      {repos.length === 0 ? (
        <EmptyState installationId={installationId} t={t} />
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] font-mono">
            <span>Repository</span>
            <span className="hidden sm:inline">Default branch</span>
            <span className="hidden md:inline">Last analysis</span>
            <span>Status</span>
          </div>
          {repos.map((repo: any) => (
            <Link
              key={repo.id}
              href={`/dashboard/${installationId}/repos/${repo.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition group"
            >
              <div className="min-w-0">
                <div className="font-mono text-[13px] font-semibold text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition truncate">
                  {repo.full_name}
                </div>
                <div className="text-[11px] text-[color:var(--dg-fg-subtle)] font-mono mt-0.5 truncate sm:hidden">
                  {repo.default_branch}
                </div>
              </div>
              <span className="hidden sm:inline font-mono text-[12px] text-[color:var(--dg-fg-muted)]">
                {repo.default_branch}
              </span>
              <span className="hidden md:inline font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                {repo.last_analysis_at ? new Date(repo.last_analysis_at).toLocaleDateString() : "—"}
              </span>
              <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${repo.enabled ? "text-allowed" : "text-[color:var(--dg-fg-subtle)]"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${repo.enabled ? "bg-allowed dg-pulse" : "bg-[color:var(--dg-fg-subtle)]"}`} />
                {repo.enabled ? t("repos.statusActive") : t("repos.statusOff")}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Recent analyses */}
      {lastAnalyses.length > 0 && (
        <section className="mt-12">
          <div className="dg-label mb-3">{t("repos.recentAnalyses")}</div>
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
            {lastAnalyses.slice(0, 5).map((a: any) => (
              <Link
                key={a.id}
                href={`/dashboard/${installationId}/analyses/${a.id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    a.risk_score > 70 ? "bg-blocked" :
                    a.risk_score > 40 ? "bg-warned" :
                    "bg-allowed"
                  }`} />
                  <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">{a.repo_full_name || "—"}</span>
                  <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hidden sm:inline">PR #{a.pr_number}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                    risk {a.risk_score || 0}
                  </span>
                  <span className="text-[color:var(--dg-fg-subtle)] group-hover:text-[color:var(--dg-electric-bright)] transition">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="bg-[color:var(--dg-canvas)] px-4 py-4 sm:py-5">
      <div className="dg-label">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
        accent ? "text-[color:var(--dg-electric-bright)]" : "text-[color:var(--dg-fg)]"
      }`}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ installationId, t }: { installationId: string; t: (key: string) => string }) {
  return (
    <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 sm:p-12 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] mb-5">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
          <path d="M10 2C8.5 2 5.5 3.1 4 4L4 9C4 13 7 15.5 10 17C13 15.5 16 13 16 9L16 4C14.5 3.1 11.5 2 10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <line x1="6.5" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="7.5" y1="12.5" x2="11.5" y2="12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>
      <h2 className="font-sans text-lg font-semibold tracking-tight text-[color:var(--dg-fg)]">
        {t("repos.noReposTitle")}
      </h2>
      <p className="mt-2 max-w-md mx-auto text-[13px] text-[color:var(--dg-fg-muted)]">
        {t("repos.noReposBody")}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://github.com/apps/driftguard-app/installations/new"
          className="dg-button dg-button-primary text-[12px]"
        >
          {t("repos.addRepository")}
        </a>
        <a
          href="/docs"
          className="dg-button dg-button-ghost text-[12px]"
        >
          {t("repos.readDocs")}
        </a>
      </div>
    </div>
  );
}
