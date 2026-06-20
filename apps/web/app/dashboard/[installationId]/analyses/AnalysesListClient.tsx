"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type RiskBucket = "high" | "medium" | "low";

const RISK_ORDER: RiskBucket[] = ["high", "medium", "low"];

const RISK_CHIP: Record<RiskBucket, string> = {
  high:   "text-blocked border-blocked/30 bg-blocked/10",
  medium: "text-warned border-warned/30 bg-warned/10",
  low:    "text-allowed border-allowed/30 bg-allowed/10",
};

function riskBucket(score: number | null): RiskBucket | null {
  if (score == null) return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function riskColor(score: number | null): string {
  if (score == null) return "text-[color:var(--dg-fg-subtle)]";
  if (score >= 70) return "text-blocked";
  if (score >= 40) return "text-warned";
  return "text-allowed";
}

function riskBg(score: number | null): string {
  if (score == null) return "bg-[color:var(--dg-border)]/20";
  if (score >= 70) return "bg-blocked/10";
  if (score >= 40) return "bg-warned/10";
  return "bg-allowed/10";
}

const STATUS_BADGE: Record<string, string> = {
  completed: "text-allowed border-allowed/30 bg-allowed/5",
  failed:    "text-blocked border-blocked/30 bg-blocked/5",
  running:   "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
  pending:   "text-warned border-warned/30 bg-warned/5",
};

export type AnalysisRow = {
  id: string;
  repo_full_name: string | null;
  pr_number: number | null;
  risk_score: number | null;
  status: string | null;
  policy_verdict: string | null;
  head_sha: string | null;
  files_scanned: number | null;
  date: string | null;
};

type Labels = {
  filterPlaceholder: string;
  riskAll: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  noMatch: string;
  colRisk: string;
  colRepo: string;
  colStatus: string;
  colFiles: string;
  colDate: string;
  manual: string;
  filesScanned: string;
  showing: string;
  of: string;
  analysesLabel: string;
};

export function AnalysesListClient({
  rows,
  installationId,
  labels: L,
}: {
  rows: AnalysisRow[];
  installationId: string;
  labels: Labels;
}) {
  const [repoFilter, setRepoFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBucket | null>(null);

  const safeRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows.filter((r) => r && typeof r === "object");
  }, [rows]);

  const riskCounts = useMemo(() => {
    const counts: Record<RiskBucket, number> = { high: 0, medium: 0, low: 0 };
    for (const r of safeRows) {
      const bucket = riskBucket(r.risk_score);
      if (bucket) counts[bucket]++;
    }
    return counts;
  }, [safeRows]);

  const filtered = useMemo(() => {
    let out = safeRows;
    if (riskFilter) out = out.filter((r) => riskBucket(r.risk_score) === riskFilter);
    const q = repoFilter.trim().toLowerCase();
    if (q) out = out.filter((r) => (r.repo_full_name ?? "").toLowerCase().includes(q));
    return out;
  }, [safeRows, riskFilter, repoFilter]);

  const RISK_LABEL: Record<RiskBucket, string> = {
    high:   L.riskHigh,
    medium: L.riskMedium,
    low:    L.riskLow,
  };

  const isFiltered = !!riskFilter || !!repoFilter.trim();

  return (
    <div className="space-y-3">
      {/* Risk chips + repo search */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setRiskFilter(null)}
          aria-pressed={riskFilter === null}
          className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
            riskFilter === null
              ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
              : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
          }`}
        >
          {L.riskAll}
        </button>
        {RISK_ORDER.filter((b) => riskCounts[b] > 0 || riskFilter === b).map((b) => (
          <button
            key={b}
            onClick={() => setRiskFilter(riskFilter === b ? null : b)}
            aria-pressed={riskFilter === b}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              riskFilter === b
                ? RISK_CHIP[b]
                : `${RISK_CHIP[b]} opacity-50 hover:opacity-100`
            }`}
          >
            {riskCounts[b]} {RISK_LABEL[b]}
          </button>
        ))}

        {isFiltered && (
          <span className="ml-auto font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {L.showing} {filtered.length} {L.of} {safeRows.length} {L.analysesLabel}
          </span>
        )}
      </div>

      <input
        type="search"
        value={repoFilter}
        onChange={(e) => setRepoFilter(e.target.value)}
        placeholder={L.filterPlaceholder}
        aria-label={L.filterPlaceholder}
        className="w-full max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-sans text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <>
          {/* Table header — desktop only */}
          <div className="hidden sm:grid grid-cols-[44px_1fr_90px_100px_110px] gap-4 bg-[color:var(--dg-surface)] border border-b-0 border-[color:var(--dg-border)] rounded-t-md px-4 py-2">
            {[L.colRisk, L.colRepo, L.colStatus, L.colFiles, L.colDate].map((h) => (
              <span key={h} className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {h}
              </span>
            ))}
          </div>

          <div className="rounded-md sm:rounded-t-none border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
            {filtered.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/${installationId}/analyses/${a.id}`}
                className="flex sm:grid sm:grid-cols-[44px_1fr_90px_100px_110px] items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition group"
              >
                <div
                  className={`w-10 h-10 sm:w-10 sm:h-9 rounded font-mono text-[12px] font-bold flex items-center justify-center shrink-0 ${riskBg(a.risk_score)} ${riskColor(a.risk_score)}`}
                >
                  {a.risk_score ?? "—"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                    {a.repo_full_name || "—"}
                    {a.pr_number ? (
                      <span className="text-[color:var(--dg-fg-muted)]">#{a.pr_number}</span>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                      {a.head_sha ? a.head_sha.slice(0, 7) : L.manual}
                      <span className="sm:hidden">
                        {a.date ? ` · ${a.date}` : ""}
                      </span>
                    </span>
                    {a.policy_verdict && a.policy_verdict !== "pass" && (
                      <span className={`font-sans font-medium text-[9px] uppercase tracking-widest rounded px-1 py-0.5 ${
                        a.policy_verdict === "block" ? "text-blocked bg-blocked/10" : "text-warned bg-warned/10"
                      }`}>
                        {a.policy_verdict}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex items-center">
                  {a.status ? (
                    <span className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${STATUS_BADGE[a.status] ?? "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]"}`}>
                      {a.status}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">—</span>
                  )}
                </div>

                <div className="hidden sm:block font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
                  {a.files_scanned != null ? L.filesScanned.replace("{n}", String(a.files_scanned)) : "—"}
                </div>

                <div className="hidden sm:flex items-center justify-between gap-2">
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {a.date ?? "—"}
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
        </>
      )}
    </div>
  );
}
