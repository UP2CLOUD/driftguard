"use client";

import { useState, useMemo, useCallback, useRef } from "react";

type SevBucket = "critical" | "high" | "medium" | "low" | "info";

const SEV_ORDER: SevBucket[] = ["critical", "high", "medium", "low", "info"];

const SEV_CHIP: Record<SevBucket, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/10",
  high:     "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/10",
  medium:   "text-warned border-warned/30 bg-warned/10",
  low:      "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]",
  info:     "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]",
};

const CAT_ICON: Record<string, string> = {
  iam: "⚿", network: "⬡", encryption: "🔒", storage: "◫", compute: "⬜",
  secrets: "★", kubernetes: "☸", github_actions: "⚡", best_practice: "◎", general: "◈",
};

export type FindingRow = {
  severity: string | null;
  rule_id: string | null;
  category: string | null;
  title: string | null;
  message: string | null;
  file: string | null;
  line: number | null;
  resource: string | null;
  suggestion: string | null;
  controls: string[];
};

type Labels = {
  sevAll: string;
  sevCritical: string;
  sevHigh: string;
  sevMedium: string;
  sevLow: string;
  sevInfo: string;
  searchPlaceholder: string;
  noMatch: string;
  suggestedFix: string;
  copyFix: string;
  copied: string;
  showing: string;
  of: string;
  findingsLabel: string;
  exportCsv: string;
};

function exportFindingsToCsv(rows: FindingRow[], filename: string) {
  const headers = ["severity", "rule_id", "category", "title", "message", "file", "line", "resource", "suggestion", "controls"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((f) =>
      [
        f.severity ?? "",
        f.rule_id ?? "",
        f.category ?? "",
        f.title ?? "",
        f.message ?? "",
        f.file ?? "",
        String(f.line ?? ""),
        f.resource ?? "",
        f.suggestion ?? "",
        (f.controls ?? []).join("; "),
      ]
        .map(esc)
        .join(",")
    ),
  ];
  const blob = new Blob(["\ufeff",  lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function FindingsListClient({
  findings,
  labels: L,
  initialSev,
}: {
  findings: FindingRow[];
  labels: Labels;
  initialSev?: SevBucket | null;
}) {
  const [sevFilter, setSevFilter] = useState<SevBucket | null>(initialSev ?? null);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyFix = useCallback((suggestion: string, idx: number) => {
    navigator.clipboard.writeText(suggestion).then(() => {
      setCopiedIdx(idx);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 2000);
    }).catch(() => {});
  }, []);

  const safeFindings = useMemo(() => {
    if (!Array.isArray(findings)) return [];
    return findings.filter((f) => f && typeof f === "object");
  }, [findings]);

  const sevCounts = useMemo(() => {
    const counts: Record<SevBucket, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of safeFindings) {
      const s = (f.severity ?? "").toLowerCase();
      if (s === "critical" || s === "high" || s === "medium" || s === "low" || s === "info") {
        counts[s as SevBucket]++;
      }
    }
    return counts;
  }, [safeFindings]);

  const filtered = useMemo(() => {
    let out = safeFindings;
    if (sevFilter) out = out.filter((f) => (f.severity ?? "").toLowerCase() === sevFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((f) =>
        (f.title ?? "").toLowerCase().includes(q) ||
        (f.rule_id ?? "").toLowerCase().includes(q) ||
        (f.message ?? "").toLowerCase().includes(q) ||
        (f.file ?? "").toLowerCase().includes(q) ||
        (f.resource ?? "").toLowerCase().includes(q) ||
        (f.suggestion ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [safeFindings, sevFilter, query]);

  const SEV_LABEL: Record<SevBucket, string> = {
    critical: L.sevCritical,
    high:     L.sevHigh,
    medium:   L.sevMedium,
    low:      L.sevLow,
    info:     L.sevInfo,
  };

  const isFiltered = !!sevFilter || !!query.trim();

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      try {
        const sev = sevFilter ?? "all";
        const sanitizedQuery = query.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
        const q = sanitizedQuery ? `-${sanitizedQuery.slice(0, 20)}` : "";
        exportFindingsToCsv(filtered, `findings-${sev}${q}.csv`);
      } finally {
        setExporting(false);
      }
    }, 0);
  }, [filtered, sevFilter, query]);

  return (
    <div className="space-y-3">
      {/* Severity filter chips + search */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSevFilter(null)}
          aria-pressed={sevFilter === null}
          className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
            sevFilter === null
              ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
              : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
          }`}
        >
          {L.sevAll}
        </button>
        {SEV_ORDER.filter((s) => sevCounts[s] > 0 || sevFilter === s).map((s) => (
          <button
            key={s}
            onClick={() => setSevFilter(sevFilter === s ? null : s)}
            aria-pressed={sevFilter === s}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              sevFilter === s ? SEV_CHIP[s] : `${SEV_CHIP[s]} opacity-50 hover:opacity-100`
            }`}
          >
            {sevCounts[s]} {SEV_LABEL[s]}
          </button>
        ))}

        {isFiltered && (
          <span className="ml-auto font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {L.showing} {filtered.length} {L.of} {safeFindings.length} {L.findingsLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.searchPlaceholder}
          aria-label={L.searchPlaceholder}
          className="flex-1 min-w-0 max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-sans text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        {filtered.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            aria-label={L.exportCsv}
            className="shrink-0 flex items-center gap-1.5 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-sans text-[11px] font-medium text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-fg-subtle)] transition cursor-pointer disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
              <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
            </svg>
            {L.exportCsv}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((f, i) => (
            <div key={`${f.rule_id ?? ""}-${f.file ?? ""}-${f.line ?? ""}-${i}`} className="px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              {/* Severity + rule + category */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${SEV_CHIP[(f.severity ?? "info").toLowerCase() as SevBucket] ?? SEV_CHIP.info}`}>
                  {f.severity ?? "info"}
                </span>
                {f.rule_id && (
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5">
                    {f.rule_id}
                  </span>
                )}
                {f.category && (
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {CAT_ICON[f.category.toLowerCase()] ?? "◈"} {f.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)] mb-1">
                {f.title || f.message}
              </p>

              {/* File + line */}
              {f.file && (
                <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] mb-2 flex items-center gap-1.5">
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>{f.file}{f.line ? `:${f.line}` : ""}</span>
                  {f.resource && f.resource !== f.file && (
                    <span className="text-[color:var(--dg-fg-muted)]">· {f.resource}</span>
                  )}
                </p>
              )}

              {/* Message (if different from title) */}
              {f.title && f.message !== f.title && (
                <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-2">{f.message}</p>
              )}

              {/* Suggestion */}
              {f.suggestion && (
                <div className="mt-2 rounded border border-allowed/20 bg-allowed/5 px-3 py-2 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-allowed mr-2">
                      {L.suggestedFix}
                    </span>
                    <span className="font-mono text-[11px] text-allowed">{f.suggestion}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyFix(f.suggestion!, i)}
                    aria-label={copiedIdx === i ? L.copied : L.copyFix}
                    className="shrink-0 p-1 rounded text-allowed/60 hover:text-allowed hover:bg-allowed/10 transition cursor-pointer"
                    title={copiedIdx === i ? L.copied : L.copyFix}
                  >
                    {copiedIdx === i ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Controls */}
              {f.controls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.controls.map((ctrl, j) => (
                    <span
                      key={j}
                      className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5"
                    >
                      {ctrl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
