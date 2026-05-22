import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { fetchInstallationRepos } from "@/lib/github-installation";

export default async function RepoList({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  // Try backend API first, fall back to GitHub API directly
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let repos: any[] = [];
  let lastAnalyses: any[] = [];
  let orgPlan = "free";
  let apiAvailable = false;

  // Fetch real dashboard overview (replaces individual org/repo/analyses fetches)
  let overview: Record<string, any> | null = null;
  try {
    const ovRes = await fetch(
      `${apiUrl}/api/v1/dashboard/overview?installation_id=${installationId}`,
      { headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
        next: { revalidate: 20 }, signal: AbortSignal.timeout(3000) }
    );
    if (ovRes.ok) { overview = await ovRes.json(); apiAvailable = true; }
  } catch { /* backend offline */ }

  if (overview) {
    orgPlan = overview.plan ?? "free";
    lastAnalyses = overview.recent_analyses ?? [];
  }

  try {
    const orgRes = await fetch(
      `${apiUrl}/api/v1/orgs/by-installation/${installationId}`,
      {
        headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (orgRes.ok) {
      apiAvailable = true;
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
    // API not reachable — fall back to GitHub
  }

  // Fallback: fetch repos directly from GitHub API
  if (!apiAvailable) {
    const ghRepos = await fetchInstallationRepos(installationId);
    repos = ghRepos.map((r) => ({
      id: String(r.id),
      full_name: r.full_name,
      default_branch: r.default_branch,
      enabled: true,
      html_url: r.html_url,
    }));
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

      {/* API unavailable banner */}
      {!apiAvailable && repos.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-warned/30 bg-warned/5 px-4 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
          <p className="font-mono text-[11px] text-warned">
            Backend API offline — showing repos from GitHub directly. Analysis history unavailable.
          </p>
        </div>
      )}

      {/* Stats strip */}
      <div className="mb-8 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] grid-cols-2 sm:grid-cols-4">
        <StatCell label="Repos" value={repos.length} />
        <StatCell label="Analyses" value={lastAnalyses.length} />
        <StatCell
          label="Avg risk"
          value={
            lastAnalyses.length
              ? Math.round(
                  lastAnalyses.reduce((s: number, a: any) => s + (a.risk_score || 0), 0) /
                    lastAnalyses.length
                )
              : "—"
          }
        />
        <StatCell label="Plan" value={orgPlan} accent={orgPlan !== "free"} />
      </div>

      {/* Repo list */}
      {repos.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] font-mono">
            <span>Repository</span>
            <span className="hidden sm:inline">Branch</span>
            <span>Status</span>
          </div>
          {repos.map((repo: any) => {
            const href = apiAvailable
              ? `/dashboard/${installationId}/repos/${repo.id}`
              : (repo.html_url ?? `https://github.com/${repo.full_name}`);
            return (
              <Link
                key={repo.id}
                href={href}
                target={apiAvailable ? undefined : "_blank"}
                rel={apiAvailable ? undefined : "noreferrer"}
                className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3.5 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-semibold text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition truncate">
                    {repo.full_name}
                  </div>
                </div>
                <span className="hidden sm:inline font-mono text-[12px] text-[color:var(--dg-fg-muted)]">
                  {repo.default_branch}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${
                    repo.enabled
                      ? "text-allowed"
                      : "text-[color:var(--dg-fg-subtle)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      repo.enabled ? "bg-allowed dg-pulse" : "bg-[color:var(--dg-fg-subtle)]"
                    }`}
                  />
                  {repo.enabled ? "active" : "off"}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent analyses (only when API available) */}
      {apiAvailable && lastAnalyses.length > 0 && (
        <section className="mt-12">
          <div className="dg-label mb-3">{t("repos.recentAnalyses")}</div>
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
            {lastAnalyses.map((a: any) => (
              <Link
                key={a.id}
                href={`/dashboard/${installationId}/analyses/${a.id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      (a.risk_score ?? 0) > 70
                        ? "bg-blocked"
                        : (a.risk_score ?? 0) > 40
                          ? "bg-warned"
                          : "bg-allowed"
                    }`}
                  />
                  <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                    {a.repo_full_name ?? a.repo ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hidden sm:inline">
                    PR #{a.pr_number}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                    risk {a.risk_score ?? 0}
                  </span>
                  <span className="text-[color:var(--dg-fg-subtle)] group-hover:text-[color:var(--dg-electric-bright)] transition">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: any;
  accent?: boolean;
}) {
  return (
    <div className="bg-[color:var(--dg-canvas)] px-4 py-4 sm:py-5">
      <div className="dg-label">{label}</div>
      <div
        className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
          accent
            ? "text-[color:var(--dg-electric-bright)]"
            : "text-[color:var(--dg-fg)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 sm:p-12 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] mb-5">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          className="text-[color:var(--dg-electric)]"
        >
          <path
            d="M2 3 L11 7 L20 3 L20 14 L11 19 L2 14 Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
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
        <Link href="/docs" className="dg-button dg-button-ghost text-[12px]">
          {t("repos.readDocs")}
        </Link>
      </div>
    </div>
  );
}
