import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import { formatDate } from "@/lib/format-date";
import { MemorySearch } from "./MemorySearch";

const PAGE_SIZE = 20;

async function fetchMemory(id: string, offset: number) {
  // Fetch one extra to detect next page without a COUNT query.
  const [rawEntries, stats] = await Promise.all([
    beGet<any[]>(`/api/v1/memory?installation_id=${id}&limit=${PAGE_SIZE + 1}&offset=${offset}`, { revalidate: 30, timeout: 3000 }),
    beGet<any>(`/api/v1/memory/stats?installation_id=${id}`, { revalidate: 30, timeout: 3000 }),
  ]);
  const raw = rawEntries ?? [];
  return {
    entries: raw.slice(0, PAGE_SIZE),
    hasNext: raw.length > PAGE_SIZE,
    stats:   stats ?? { total: 0, by_outcome: {}, by_severity: {} },
  };
}

const OUT_COLOR: Record<string, string> = {
  blocked:  "text-blocked",
  approved: "text-allowed",
  warned:   "text-warned",
  merged:   "text-[color:var(--dg-electric-bright)]",
};

const OUT_BADGE: Record<string, string> = {
  blocked:  "border-blocked/30 bg-blocked/5 text-blocked",
  approved: "border-allowed/30 bg-allowed/5 text-allowed",
  warned:   "border-warned/30 bg-warned/5 text-warned",
  merged:   "border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5 text-[color:var(--dg-electric-bright)]",
};

const BLAST_COLOR: Record<string, string> = {
  high:   "text-blocked",
  medium: "text-warned",
  low:    "text-[color:var(--dg-fg-subtle)]",
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-blocked",
  high:     "text-[color:var(--dg-severity-high)]",
  medium:   "text-warned",
  low:      "text-[color:var(--dg-fg-subtle)]",
};

export default async function MemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ installationId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const { entries, hasNext, stats } = await fetchMemory(installationId, offset);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="dg-label mb-2">{t("memory.eyebrow")}</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("memory.title")}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("memory.subtitle").replace("{total}", String(stats.total))}
        </p>
      </div>

      <MemorySearch
        installationId={installationId}
        labels={{
          placeholder: t("memory.searchPlaceholder") ?? "e.g. unencrypted RDS storage in production",
          search: t("memory.searchButton") ?? "Recall",
          searching: t("memory.searching") ?? "Searching…",
          noResults: t("memory.noResults") ?? "No similar incidents in memory for this query.",
          tooShort: t("memory.tooShort") ?? "Type at least 3 characters.",
          error: t("memory.searchError") ?? "Search failed — the API or embedding service may be unavailable.",
          similarity: t("memory.similarity") ?? "match",
          hint: t("memory.searchHint") ?? "semantic search over past incidents — the same recall the AI reviewer uses on every PR",
          viewAnalysis: t("memory.viewAnalysis") ?? "View analysis →",
        }}
      />

      {stats.total > 0 && (
        <div className="space-y-px mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-t-md overflow-hidden border border-b-0 border-[color:var(--dg-border)]">
            <div className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="dg-label mb-1">{t("memory.total")}</div>
              <div className="font-mono text-2xl font-bold text-[color:var(--dg-fg)]">{stats.total}</div>
            </div>
            {Object.entries(stats.by_outcome as Record<string, number>).map(([k, v]) => (
              <div key={k} className="bg-[color:var(--dg-canvas)] px-4 py-4">
                <div className="dg-label mb-1">{t(`memory.${k}` as any) ?? k}</div>
                <div className={`font-mono text-2xl font-bold ${OUT_COLOR[k] ?? "text-[color:var(--dg-fg)]"}`}>{v}</div>
              </div>
            ))}
          </div>
          {Object.keys(stats.by_severity ?? {}).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-b-md overflow-hidden border border-t-0 border-[color:var(--dg-border)]">
              {Object.entries(stats.by_severity as Record<string, number>).map(([k, v]) => (
                <div key={k} className="bg-[color:var(--dg-surface)] px-4 py-3">
                  <div className="dg-label mb-1">{t(`memory.sev_${k}` as any) ?? k}</div>
                  <div className={`font-mono text-lg font-bold ${SEV_COLOR[k] ?? "text-[color:var(--dg-fg)]"}`}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {entries.length === 0 && page === 1 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">{t("memory.engineReady")}</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("memory.noTitle")}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-md mx-auto leading-relaxed">
            {t("memory.noBody")}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {entries.map((e: any) => (
            <Link
              key={e.id}
              href={e.analysis_id ? `/dashboard/${installationId}/analyses/${e.analysis_id}` : "#"}
              className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <div className="flex-1 min-w-0">
                {/* Top row: repo + outcome badge */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <code className="font-mono text-[12px] text-[color:var(--dg-fg)]">
                    {e.repo_full_name}
                    {e.pr_number ? <span className="text-[color:var(--dg-fg-muted)]">#{e.pr_number}</span> : null}
                  </code>
                  {e.outcome && (
                    <span className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${OUT_BADGE[e.outcome] ?? "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)]"}`}>
                      {e.outcome}
                    </span>
                  )}
                  {e.severity && (
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest">
                      {e.severity}
                    </span>
                  )}
                  {e.blast_radius && (
                    <span className={`font-sans font-medium text-[10px] uppercase tracking-widest ${BLAST_COLOR[e.blast_radius] ?? ""}`}>
                      blast:{e.blast_radius}
                    </span>
                  )}
                </div>

                {/* Intent summary */}
                {e.intent_text && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] line-clamp-2 mb-1.5">
                    {e.intent_text}
                  </p>
                )}

                {/* Footer: date + analysis link */}
                <div className="flex items-center gap-3">
                  {e.created_at && (
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                      {formatDate(e.created_at, preferences.locale)}
                    </span>
                  )}
                  {e.analysis_id && (
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)]">
                      {t("memory.viewAnalysis") ?? "View analysis →"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between mt-4">
          {page > 1 ? (
            <Link
              href={`?page=${page - 1}`}
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
              href={`?page=${page + 1}`}
              className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
            >
              {t("analyses.next") ?? "Next →"}
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
