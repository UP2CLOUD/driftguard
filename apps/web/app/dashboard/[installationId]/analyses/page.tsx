import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { formatDate } from "@/lib/format-date";

const PAGE_SIZE = 50;

async function fetchOrgAnalyses(installationId: string, offset: number) {
  const org = await beGet<{ id: string }>(
    `/api/v1/orgs/by-installation/${installationId}`,
    { revalidate: 10, timeout: 5000 },
  );
  if (!org?.id) return [];
  return (
    (await beGet<any[]>(`/api/v1/orgs/${org.id}/analyses?limit=${PAGE_SIZE}&offset=${offset}`, {
      revalidate: 10,
      timeout: 8000,
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

const STATUS_BADGE: Record<string, string> = {
  completed: "text-allowed border-allowed/30 bg-allowed/5",
  failed: "text-blocked border-blocked/30 bg-blocked/5",
  running: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
  pending: "text-warned border-warned/30 bg-warned/5",
};

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

  const all = await fetchOrgAnalyses(installationId, offset);
  const hasNext = all.length === PAGE_SIZE;

  const completed = all.filter((a: any) => a.status === "completed");
  const failed = all.filter((a: any) => a.status === "failed");
  const running = all.filter((a: any) => a.status === "running" || a.status === "pending");

  const filtered =
    filter === "completed"
      ? completed
      : filter === "failed"
        ? failed
        : filter === "running"
          ? running
          : all;

  const activeTab = filter ?? "all";

  const tabs = [
    { key: "all", label: "All", count: all.length },
    { key: "completed", label: "Completed", count: completed.length },
    { key: "failed", label: "Failed", count: failed.length },
    { key: "running", label: "In progress", count: running.length },
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
        <div className="dg-label mb-1.5">Infrastructure scanner</div>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          Analyses
        </h1>
        {all.length > 0 && (
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
            {all.length} total · {completed.length} completed · {failed.length} failed
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
                {tab.count > 0 && (
                  <span
                    className={`rounded px-1 font-mono text-[10px] ${
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
              <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                No analyses yet
              </div>
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
                Analyses are created automatically when a Terraform PR is opened.
              </p>
              <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed mb-5">
                You can also trigger a manual scan from the Repositories page.
              </p>
              <Link
                href={`/dashboard/${installationId}/repos`}
                className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
              >
                Go to Repositories →
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
              No analyses match this filter.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Table header — desktop only */}
          <div className="hidden sm:grid grid-cols-[44px_1fr_90px_100px_110px] gap-4 bg-[color:var(--dg-surface)] border border-b-0 border-[color:var(--dg-border)] rounded-t-md px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Risk</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Repository / PR</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Status</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Files</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Date</span>
          </div>

          <div className="rounded-md sm:rounded-t-none border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
            {filtered.map((a: any) => (
              <Link
                key={a.id}
                href={`/dashboard/${installationId}/analyses/${a.id}`}
                className="flex sm:grid sm:grid-cols-[44px_1fr_90px_100px_110px] items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                {/* Risk score badge */}
                <div
                  className={`w-10 h-10 sm:w-10 sm:h-9 rounded font-mono text-[12px] font-bold flex items-center justify-center shrink-0 ${riskBg(a.risk_score ?? null)} ${riskColor(a.risk_score ?? null)}`}
                >
                  {a.risk_score ?? "—"}
                </div>

                {/* Repo + PR */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                    {a.repo_full_name || "—"}
                    {a.pr_number ? (
                      <span className="text-[color:var(--dg-fg-muted)]">#{a.pr_number}</span>
                    ) : null}
                  </p>
                  <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {a.head_sha ? a.head_sha.slice(0, 7) : "manual"}
                    {/* Mobile: show date + status inline */}
                    <span className="sm:hidden">
                      {a.created_at ? ` · ${formatDate(a.created_at, prefs.locale)}` : ""}
                    </span>
                  </p>
                </div>

                {/* Status */}
                <div className="hidden sm:flex items-center">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_BADGE[a.status] ?? "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]"}`}
                  >
                    {a.status}
                  </span>
                </div>

                {/* Files scanned */}
                <div className="hidden sm:block font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
                  {a.files_scanned != null ? `${a.files_scanned} files` : "—"}
                </div>

                {/* Date */}
                <div className="hidden sm:flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {a.created_at ? formatDate(a.created_at, prefs.locale) : "—"}
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

          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between mt-4">
              {page > 1 ? (
                <Link
                  href={pageHref(activeTab, page - 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  ← Previous
                </Link>
              ) : <span />}
              <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                Page {page}
              </span>
              {hasNext ? (
                <Link
                  href={pageHref(activeTab, page + 1)}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  Next →
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
