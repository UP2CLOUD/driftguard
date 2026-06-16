import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScanTrigger } from "@/components/dashboard/ScanTrigger";
import { UploadScan } from "@/components/dashboard/UploadScan";
import { RepoQuickScan } from "@/components/dashboard/RepoQuickScan";
import { RepoToggle } from "@/components/RepoToggle";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { beGet } from "@/lib/backend";
import { formatDate } from "@/lib/format-date";

type PlanData = {
  is_premium: boolean;
  repos: { active: number; limit: number | null };
};

async function fetchOrgData(installationId: string) {
  const org = await beGet<{ id: string; plan: string }>(
    `/api/v1/orgs/by-installation/${installationId}`,
    { revalidate: 10, timeout: 3000 },
  );
  return org;
}

async function fetchRepos(orgId: string) {
  return (
    (await beGet<any[]>(`/api/v1/orgs/${orgId}/repos`, { revalidate: 10, timeout: 3000 })) ?? []
  );
}

async function fetchAnalyses(orgId: string) {
  return (
    (await beGet<any[]>(`/api/v1/orgs/${orgId}/analyses?limit=30`, {
      revalidate: 10,
      timeout: 3000,
    })) ?? []
  );
}

function riskColor(score: number | null) {
  if (score == null) return "text-[color:var(--dg-fg-subtle)]";
  if (score >= 70) return "text-blocked";
  if (score >= 40) return "text-warned";
  return "text-allowed";
}

function riskBg(score: number | null) {
  if (score == null) return "bg-[color:var(--dg-border)]/20";
  if (score >= 70) return "bg-blocked/10";
  if (score >= 40) return "bg-warned/10";
  return "bg-allowed/10";
}

export default async function ReposPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const prefs = await getUserPreferences();
  const msgs = await getMessages(prefs.locale);
  const t = createTranslator(msgs);

  const org = await fetchOrgData(installationId);
  const [repos, analyses, planData] = await Promise.all([
    org ? fetchRepos(org.id) : Promise.resolve([]),
    org ? fetchAnalyses(org.id) : Promise.resolve([]),
    beGet<PlanData>(`/api/v1/billing/plan?installation_id=${installationId}`, { revalidate: 30 }),
  ]);

  const atFreeLimit =
    !planData?.is_premium &&
    planData?.repos.limit != null &&
    (planData?.repos.active ?? 0) >= planData.repos.limit;

  const recentAnalyses: any[] = analyses.slice(0, 20);

  // Map last analysis per repo
  const lastAnalysisByRepo: Record<string, any> = {};
  for (const a of analyses) {
    const key = a.repo_full_name || a.source || "";
    if (key && !lastAnalysisByRepo[key]) {
      lastAnalysisByRepo[key] = a;
    }
  }

  const installUrl = getGitHubAppInstallUrl();

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("dashboard.scanner") ?? "Infrastructure scanner"}</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("dashboard.repos") ?? "Repositories"}
          </h1>
        </div>
        {repos.length > 0 && (
          <a
            href={installUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
          >
            {t("repos.addRepo") ?? "+ Add repo"}
          </a>
        )}
      </div>

      {/* Connected Repositories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("repos.connectedRepos") ?? "Connected repositories"}
          </h2>
          <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {planData?.repos.limit != null
              ? `${planData.repos.active}/${planData.repos.limit} active`
              : `${repos.length} repo${repos.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Free plan quota bar */}
        {planData && !planData.is_premium && planData.repos.limit != null && (
          <div className="mb-4 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                {(t("repos.freePlanQuota") ?? "Free plan — {limit} active repos included").replace("{limit}", String(planData.repos.limit))}
              </span>
              {atFreeLimit && (
                <Link
                  href={`/dashboard/${installationId}/settings?intent=upgrade`}
                  className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:opacity-70 transition"
                >
                  Upgrade →
                </Link>
              )}
            </div>
            <div className="h-1 rounded-full bg-[color:var(--dg-border)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atFreeLimit ? "bg-warned" : "bg-[color:var(--dg-electric)]"}`}
                style={{ width: `${Math.min(100, ((planData.repos.active) / planData.repos.limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {repos.length === 0 ? (
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
            <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {t("repos.noReposConnected") ?? "No repositories connected"}
            </div>
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
              {t("repos.installAppToScan") ?? "Install the GitHub App to begin scanning"}
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto mb-6 leading-relaxed">
              {t("repos.installAppDesc") ?? "DriftGuard reviews every Terraform pull request — detecting security misconfigs, cost drift, and policy violations before merge."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-[color:var(--dg-electric)] px-4 py-2 font-sans font-semibold text-[11px] uppercase tracking-wide text-white hover:brightness-110 transition"
              >
                {t("repos.installGithubApp") ?? "Install GitHub App →"}
              </a>
              <Link
                href="/docs/install"
                className="rounded border border-[color:var(--dg-border)] px-4 py-2 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition"
              >
                {t("dashboard.setupGuide") ?? "Setup guide"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_90px] gap-4 bg-[color:var(--dg-surface)] px-4 py-2">
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("repos.title") ?? "Repository"}</span>
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("repos.riskHeader") ?? "Risk"}</span>
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("repos.tableHeaderLastAnalyzed") ?? "Last analyzed"}</span>
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("repos.tableHeaderStatus") ?? "Status"}</span>
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("repos.tableHeaderActive") ?? "Active"}</span>
            </div>

            {repos.map((repo: any) => {
              const last = lastAnalysisByRepo[repo.full_name];
              const riskScore = last?.risk_score ?? null;
              // repo.last_scanned_at is more accurate for repos with old analyses
              // outside the 30-item window we fetched
              const lastDate = last?.created_at
                ? formatDate(last.created_at, prefs.locale)
                : repo.last_scanned_at
                  ? formatDate(repo.last_scanned_at, prefs.locale)
                  : null;
              const isEnabled = repo.enabled !== false;

              return (
                <div
                  key={repo.id || repo.full_name}
                  className="flex sm:grid sm:grid-cols-[1fr_80px_100px_100px_90px] items-center gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition"
                >
                  {/* Repo name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isEnabled ? "bg-allowed" : "bg-[color:var(--dg-fg-subtle)]"}`} />
                    <div className="min-w-0">
                      <code className={`font-mono text-[12px] truncate block ${isEnabled ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-muted)]"}`}>
                        {repo.full_name}
                      </code>
                      <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                        {repo.default_branch ?? "main"}
                      </span>
                    </div>
                  </div>

                  {/* Risk score */}
                  <div className={`hidden sm:flex w-12 h-8 rounded font-mono text-[12px] font-bold items-center justify-center ${riskBg(riskScore)} ${riskColor(riskScore)}`}>
                    {riskScore ?? "—"}
                  </div>

                  {/* Last analyzed */}
                  <div className="hidden sm:block font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {lastDate ?? t("repos.never")}
                  </div>

                  {/* View latest / quick scan */}
                  <div className="hidden sm:flex items-center gap-2">
                    {last ? (
                      <Link
                        href={`/dashboard/${installationId}/analyses/${last.id || last.analysis_id}`}
                        className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                      >
                        {t("repos.viewLatest")}
                      </Link>
                    ) : (
                      <RepoQuickScan
                        installationId={installationId}
                        repoFullName={repo.full_name}
                        labels={{
                          scan:     t("repos.quickScan")         ?? "scan →",
                          queuing:  t("repos.quickScanQueuing")  ?? "queuing…",
                          scanning: t("repos.quickScanScanning") ?? "scanning…",
                          done:     t("repos.quickScanDone")     ?? "done ✓",
                          failed:   t("repos.quickScanFailed")   ?? "failed ✗",
                        }}
                      />
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="hidden sm:flex items-center">
                    {repo.id ? (
                      <RepoToggle
                        repoId={repo.id}
                        initialEnabled={isEnabled}
                        atFreeLimit={!!atFreeLimit && !isEnabled}
                        labels={{
                          enable:           t("repos.enable")           ?? "Enable",
                          disable:          t("repos.disable")          ?? "Disable",
                          repoLimitReached: t("repos.repoLimitReached") ?? "Repo limit reached. Disable another repo or upgrade.",
                          planLimitReached: t("repos.planLimitReached") ?? "Plan limit reached. Upgrade to add more repositories.",
                          toggleFailed:     t("repos.toggleFailed")     ?? "Failed to {action} repository.",
                          networkError:     t("repos.networkError")     ?? "Network error. Try again.",
                        }}
                      />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-allowed" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Manual scan */}
      <section>
        <h2 className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-3">
          {t("repos.manualScanHeading") ?? "Manual scan"}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-[color:var(--dg-fg-muted)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
              </svg>
              <span className="font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)]">
                {t("repos.scanGithubRepo") ?? "GitHub repository"}
              </span>
            </div>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] mb-4">
              {t("repos.scanGithubDesc") ?? "Scan any public or connected GitHub repository by name."}
            </p>
            <ScanTrigger
              installationId={installationId}
              labels={{
                placeholder:    t("repos.scanPlaceholder")    ?? "owner/repository",
                branchPlaceholder: t("repos.scanBranchPlaceholder") ?? "default branch",
                runBtn:         t("repos.scanRunBtn")         ?? "Run scan →",
                queuing:        t("repos.scanQueuing")        ?? "Queuing…",
                scanning:       t("repos.scanScanning")       ?? "Scanning…",
                complete:       t("repos.scanComplete")       ?? "Scan complete — redirecting…",
                failedWorker:   t("repos.scanFailedWorker")   ?? "Scan failed on worker",
                queuedWaiting:  t("repos.scanQueuedWaiting")  ?? "Scan queued — waiting for worker…",
                quotaExceeded:  t("repos.scanQuotaExceeded")  ?? "Monthly scan limit reached.",
                managePlan:     t("repos.managePlan")         ?? "Manage plan →",
              }}
            />
          </div>

          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-[color:var(--dg-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <span className="font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)]">
                {t("repos.uploadFiles") ?? "Upload files"}
              </span>
            </div>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] mb-4">
              {t("repos.uploadFilesDesc") ?? "Upload a .tar.gz of Terraform, Kubernetes, or GitHub Actions files."}
            </p>
            <UploadScan
              installationId={installationId}
              labels={{
                uploadScanBtn:  t("repos.uploadScanBtn")      ?? "Upload & scan →",
                scanning:       t("repos.scanScanning")       ?? "Scanning…",
                clickToSelect:  t("repos.uploadClickToSelect") ?? "Click to select",
                redirecting:    t("repos.uploadRedirecting")  ?? "Redirecting to results…",
                uploadResult:   t("repos.uploadResult")       ?? "Score {score}/100 · {n} findings",
                quotaExceeded:  t("repos.scanQuotaExceeded")  ?? "Monthly scan limit reached.",
                managePlan:     t("repos.managePlan")         ?? "Manage plan →",
              }}
            />
          </div>
        </div>
      </section>

      {/* Recent scans */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("dashboard.recentScans") ?? "Recent scans"}
          </h2>
          <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {(t("dashboard.recentScansCount") ?? "{n} total").replace("{n}", String(recentAnalyses.length))}
          </span>
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
            <p className="text-[13px] text-[color:var(--dg-fg-muted)] mb-1">
              {t("dashboard.noScansYet") ?? "No scans yet"}
            </p>
            <p className="text-[11px] text-[color:var(--dg-fg-subtle)]">
              {t("dashboard.noScansTrigger") ?? "Run a manual scan above or open a Terraform PR to trigger the first analysis."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
            {recentAnalyses.map((a: any) => (
              <Link
                key={a.id || a.analysis_id}
                href={`/dashboard/${installationId}/analyses/${a.id || a.analysis_id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                <div
                  className={`w-10 h-10 rounded font-mono text-[13px] font-bold flex items-center justify-center shrink-0 ${riskBg(a.risk_score ?? null)} ${riskColor(a.risk_score ?? null)}`}
                >
                  {a.risk_score ?? "—"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                    {a.repo_full_name || a.source || `${t("repos.scanFallback") ?? "Scan"} ${(a.id || a.analysis_id)?.slice(0, 8) ?? ""}`}
                  </p>
                  <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {a.pr_number ? `PR #${a.pr_number}` : (t("repos.manualScanLabel") ?? "manual")}
                    {a.head_sha ? ` · ${a.head_sha.slice(0, 7)}` : ""}
                    {a.created_at ? ` · ${formatDate(a.created_at, prefs.locale)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-sans font-medium text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${
                      a.status === "completed"
                        ? "text-allowed border-allowed/30 bg-allowed/5"
                        : a.status === "failed"
                          ? "text-blocked border-blocked/30 bg-blocked/5"
                          : "text-warned border-warned/30 bg-warned/5"
                    }`}
                  >
                    {a.status}
                  </span>
                  <svg
                    className="h-3 w-3 text-[color:var(--dg-fg-subtle)] opacity-0 group-hover:opacity-100 transition"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
