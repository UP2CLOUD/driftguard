import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { AnalysesListClient } from "./AnalysesListClient";

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
      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          {all.length === 0 ? (
            <>
              <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("analyses.noTitle") ?? "No analyses yet"}
              </div>
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
                {t("analyses.noBody") ?? "Analyses are created automatically when a Terraform PR is opened."}
              </p>
              <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed mb-5">
                {t("analyses.noBodySub") ?? "You can also trigger a manual scan from the Repositories page."}
              </p>
              <Link
                href={`/dashboard/${installationId}/repos`}
                className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
              >
                {t("analyses.goToRepos") ?? "Go to Repositories →"}
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
              {t("analyses.noMatchFilter") ?? "No analyses match this filter."}
            </p>
          )}
        </div>
      ) : (
        <>
          <AnalysesListClient
            rows={filtered}
            installationId={installationId}
            locale={prefs.locale}
            labels={{
              filterPlaceholder: t("analyses.repoFilterPlaceholder") ?? "Filter by repository…",
              showing: t("analyses.showing") ?? "showing",
              of: t("analyses.of") ?? "of",
              analyses: t("analyses.analysesLabel") ?? "analyses",
              noMatch: t("analyses.noMatchRepo") ?? "No analyses match this repository filter.",
              manual: t("analyses.manual") ?? "manual",
              filesScanned: t("analyses.filesScanned") ?? "{n} files",
            }}
            colLabels={{
              risk: t("analyses.colRisk") ?? "Risk",
              repo: t("analyses.colRepo") ?? "Repository / PR",
              status: t("analyses.colStatus") ?? "Status",
              files: t("analyses.colFiles") ?? "Files",
              date: t("analyses.colDate") ?? "Date",
            }}
          />

          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between mt-4">
              {page > 1 ? (
                <Link
                  href={pageHref(activeTab, page - 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.previous") ?? "← Previous"}
                </Link>
              ) : <span />}
              <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                {(t("analyses.page") ?? "Page {n}").replace("{n}", String(page))}
              </span>
              {hasNext ? (
                <Link
                  href={pageHref(activeTab, page + 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.next") ?? "Next →"}
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
