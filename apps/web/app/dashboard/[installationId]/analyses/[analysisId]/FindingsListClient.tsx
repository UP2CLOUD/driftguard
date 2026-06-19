"use client";

import { useState, useMemo } from "react";

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
  showing: string;
  of: string;
  findingsLabel: string;
};

export function FindingsListClient({
  findings,
  labels: L,
}: {
  findings: FindingRow[];
  labels: Labels;
}) {
  const [sevFilter, setSevFilter] = useState<SevBucket | null>(null);
  const [query, setQuery] = useState("");

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
        (f.file ?? "").toLowerCase().includes(q)
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

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={L.searchPlaceholder}
        aria-label={L.searchPlaceholder}
        className="w-full max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-sans text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((f, i) => (
            <div key={i} className="px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
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
                    {CAT_ICON[f.category] ?? "◈"} {f.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)] mb-1">
                {f.title || f.message}
              </p>

              {/* File + line */}
              {f.file && (
                <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] mb-2">
                  📄 {f.file}{f.line ? `:${f.line}` : ""}
                  {f.resource && f.resource !== f.file && (
                    <span className="ml-2 text-[color:var(--dg-fg-muted)]">· {f.resource}</span>
                  )}
                </p>
              )}

              {/* Message (if different from title) */}
              {f.title && f.message !== f.title && (
                <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-2">{f.message}</p>
              )}

              {/* Suggestion */}
              {f.suggestion && (
                <div className="mt-2 rounded border border-allowed/20 bg-allowed/5 px-3 py-2">
                  <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-allowed mr-2">
                    {L.suggestedFix}
                  </span>
                  <span className="font-mono text-[11px] text-allowed">{f.suggestion}</span>
                </div>
              )}

              {/* Controls */}
              {f.controls.length > 0 && (
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
