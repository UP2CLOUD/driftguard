"use client";

import { useState, useMemo } from "react";

interface Finding {
  severity: string;
  rule_id?: string | null;
  category?: string | null;
  title?: string | null;
  message: string;
  file?: string | null;
  line?: number | null;
  resource?: string | null;
  suggestion?: string | null;
  controls?: string[];
}

type Labels = {
  searchPlaceholder: string;
  showing: string;
  of: string;
  findings: string;
  noMatch: string;
  allSeverities: string;
  suggestedFix: string;
};

const SEV_STYLE: Record<string, string> = {
  critical: "text-blocked   bg-blocked/10   border-blocked/30",
  high:     "text-[color:var(--dg-severity-high)] bg-[color:var(--dg-severity-high)]/10 border-[color:var(--dg-severity-high)]/30",
  medium:   "text-warned    bg-warned/10    border-warned/30",
  low:      "text-[color:var(--dg-fg-muted)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
  info:     "text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
};

const CAT_ICON: Record<string, string> = {
  iam: "⚿", network: "⬡", encryption: "🔒", storage: "◫", compute: "⬜",
  secrets: "★", kubernetes: "☸", github_actions: "⚡", best_practice: "◎", general: "◈",
};

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export function FindingsClient({
  findings,
  labels: L,
}: {
  findings: Finding[];
  labels: Labels;
}) {
  const [sevFilter, setSevFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const bySeverity = useMemo(
    () => Object.fromEntries(SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length])),
    [findings],
  );

  const filtered = useMemo(() => {
    let out = findings;
    if (sevFilter) out = out.filter((f) => f.severity === sevFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (f) =>
          (f.file ?? "").toLowerCase().includes(q) ||
          (f.rule_id ?? "").toLowerCase().includes(q) ||
          (f.title ?? "").toLowerCase().includes(q) ||
          f.message.toLowerCase().includes(q) ||
          (f.resource ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [findings, sevFilter, search]);

  return (
    <div className="space-y-3">
      {/* Severity filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSevFilter(null)}
          className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition ${
            sevFilter === null
              ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
              : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
          }`}
        >
          {L.allSeverities}
        </button>
        {SEVERITIES.filter((s) => bySeverity[s] > 0).map((s) => (
          <button
            key={s}
            onClick={() => setSevFilter(sevFilter === s ? null : s)}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition ${
              sevFilter === s
                ? SEV_STYLE[s]
                : `${SEV_STYLE[s]} opacity-50 hover:opacity-100`
            }`}
          >
            {bySeverity[s]} {s}
          </button>
        ))}
      </div>

      {/* Text search */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L.searchPlaceholder}
          aria-label={L.searchPlaceholder}
          className="flex-1 min-w-[220px] max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        {(search.trim() || sevFilter) && (
          <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
            {L.showing} {filtered.length} {L.of} {findings.length} {L.findings}
          </span>
        )}
      </div>

      {/* Findings list */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((f, i) => (
            <div key={i} className="px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              {/* Top row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${SEV_STYLE[f.severity] ?? SEV_STYLE.info}`}>
                  {f.severity}
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
              {f.controls && f.controls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.controls.map((ctrl) => (
                    <span key={ctrl} className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5">
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
