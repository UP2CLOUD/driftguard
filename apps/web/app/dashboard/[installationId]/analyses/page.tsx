import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { formatDate } from "@/lib/format-date";
import { AnalysesListClient, type AnalysisRow } from "./AnalysesListClient";

const PAGE_SIZE = 50;

async function fetchOrgAnalyses(installationId: string, offset: number, status?: string): Promise<{ rows: any[]; hasNext: boolean }> {
  const org = await beGet<{ id: string }>(
    `/api/v1/orgs/by-installation/${installationId}`,
    { revalidate: 10, timeout: 5000 },
  );
  if (!org?.id) return { rows: [], hasNext: false };
  // Fetch one extra to detect whether a next page exists without a separate COUNT query.
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE + 1), offset: String(offset) });
  if (status) qs.set("status", status);
  const raw = (await beGet<any[]>(`/api/v1/orgs/${org.id}/analyses?${qs}`, {
    revalidate: 10,
    timeout: 8000,
  })) ?? [];
  return { rows: raw.slice(0, PAGE_SIZE), hasNext: raw.length > PAGE_SIZE };
}


export default async function AnalysesPage({
  params,
  searchParams,
}: {
  params: Promise<{ installationId: string }>;
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const { filter, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const prefs = await getUserPreferences();
  const msgs = await getMessages(prefs.locale);
  const t = createTranslator(msgs);

  // When a status filter is active, fetch only that status from the server.
  // When showing "all", fetch unfiltered and derive per-status counts client-side.
  const activeFilter = filter && ["completed", "failed", "running"].includes(filter) ? filter : undefined;
  const { rows: all, hasNext } = await fetchOrgAnalyses(installationId, offset, activeFilter);

  const completed = activeFilter ? (activeFilter === "completed" ? all : []) : all.filter((a: any) => a.status === "completed");
  const failed = activeFilter ? (activeFilter === "failed" ? all : []) : all.filter((a: any) => a.status === "failed");
  const running = activeFilter ? (activeFilter === "running" ? all : []) : all.filter((a: any) => a.status === "running" || a.status === "pending");

  const filtered = activeFilter ? all : (
    filter === "completed" ? completed :
    filter === "failed" ? failed :
    filter === "running" ? running :
    all
  );

  const analysisRows: AnalysisRow[] = filtered.map((a: any) => ({
    id: a.id,
    repo_full_name: a.repo_full_name ?? null,
    pr_number: a.pr_number ?? null,
    risk_score: a.risk_score ?? null,
    status: a.status ?? null,
    policy_verdict: a.policy_verdict ?? null,
    head_sha: a.head_sha ?? null,
    files_scanned: a.files_scanned ?? null,
    date: a.created_at ? formatDate(a.created_at, prefs.locale) : null,
  }));

  const activeTab = filter ?? "all";

  const tabs = [
    { key: "all", label: t("analyses.tabAll") ?? "All", count: activeFilter ? null : all.length },
    { key: "completed", label: t("analyses.tabCompleted") ?? "Completed", count: activeFilter === "completed" ? all.length : (activeFilter ? null : completed.length) },
    { key: "failed", label: t("analyses.tabFailed") ?? "Failed", count: activeFilter === "failed" ? all.length : (activeFilter ? null : failed.length) },
    { key: "running", label: t("analyses.tabRunning") ?? "In progress", count: activeFilter === "running" ? all.length : (activeFilter ? null : running.length) },
  ];

  const pageHref = (tab: string, p: number) => {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("filter", tab);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `?${q}` : "?";
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="dg-label mb-1.5">{t("analyses.eyebrow") ?? "Infrastructure scanner"}</div>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("analyses.title") ?? "Analyses"}
        </h1>
        {all.length > 0 && !activeFilter && (
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
            {(t("analyses.statusSummary") ?? "{completed} completed · {failed} failed · {inProgress} in progress")
              .replace("{completed}", String(completed.length))
              .replace("{failed}", String(failed.length))
              .replace("{inProgress}", String(running.length))}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 sm:mx-0 mb-5 sm:mb-6 border-b border-[color:var(--dg-border)]">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide px-4 sm:px-0">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            const href = pageHref(tab.key, 1);
            return (
              <a
                key={tab.key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 min-h-[40px] sm:min-h-0 sm:py-2 font-mono text-[12px] sm:text-[11px] uppercase tracking-wider border-b-2 transition -mb-px ${
                  isActive
                    ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)]"
                    : "border-transparent text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)]"
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={`rounded px-1 font-sans font-medium text-[10px] ${
                      isActive
                        ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)]"
                        : "bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-subtle)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* List */}
      {all.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("analyses.noTitle")}
          </div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("analyses.noBody")}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed mb-5">
            {t("analyses.noBodySub")}
          </p>
          <Link
            href={`/dashboard/${installationId}/repos`}
            className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
          >
            {t("analyses.goToRepos")}
          </Link>
        </div>
      ) : (
        <>
          <AnalysesListClient
            rows={analysisRows}
            installationId={installationId}
            labels={{
              filterPlaceholder: t("analyses.filterPlaceholder"),
              riskAll: t("analyses.riskAll"),
              riskHigh: t("analyses.riskHigh"),
              riskMedium: t("analyses.riskMedium"),
              riskLow: t("analyses.riskLow"),
              noMatch: t("analyses.noMatchFilter"),
              colRisk: t("analyses.colRisk"),
              colRepo: t("analyses.colRepo"),
              colStatus: t("analyses.colStatus"),
              colFiles: t("analyses.colFiles"),
              colDate: t("analyses.colDate"),
              manual: t("analyses.manual"),
              filesScanned: t("analyses.filesScanned"),
              showing: t("analyses.showing"),
              of: t("analyses.of"),
              analysesLabel: t("analyses.analysesLabel"),
            }}
          />

          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between mt-4">
              {page > 1 ? (
                <Link
                  href={pageHref(activeTab, page - 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.previous")}
                </Link>
              ) : <span />}
              <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                {t("analyses.page").replace("{n}", String(page))}
              </span>
              {hasNext ? (
                <Link
                  href={pageHref(activeTab, page + 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.next")}
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
