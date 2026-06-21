"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type RiskBucket = "high" | "medium" | "low";

function riskBucket(score: number | null): RiskBucket | null {
  if (score == null) return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function riskBg(score: number | null) {
  if (score == null) return "bg-[color:var(--dg-border)]/20";
  if (score >= 70) return "bg-blocked/10";
  if (score >= 40) return "bg-warned/10";
  return "bg-allowed/10";
}

function riskColor(score: number | null) {
  if (score == null) return "text-[color:var(--dg-fg-subtle)]";
  if (score >= 70) return "text-blocked";
  if (score >= 40) return "text-warned";
  return "text-allowed";
}

const RISK_CHIP: Record<RiskBucket, string> = {
  high:   "text-blocked border-blocked/30 bg-blocked/10",
  medium: "text-warned border-warned/30 bg-warned/10",
  low:    "text-allowed border-allowed/30 bg-allowed/10",
};

const STATUS_CHIP: Record<string, string> = {
  completed: "text-allowed border-allowed/30 bg-allowed/10",
  failed:    "text-blocked border-blocked/30 bg-blocked/10",
};

export type AnalysisRow = {
  id: string;
  risk_score: number | null;
  status: string;
  policy_verdict: string | null;
  pr_number: number | null;
  head_sha: string | null;
  created_at: string | null;
  date: string | null;
};

type Labels = {
  riskAll: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  statusAll: string;
  statusCompleted: string;
  statusFailed: string;
  noMatch: string;
  manualScan: string;
};

export function RepoAnalysesClient({
  analyses,
  installationId,
  repoFullName,
  labels: L,
}: {
  analyses: AnalysisRow[];
  installationId: string;
  repoFullName?: string | null;
  labels: Labels;
}) {
  const router = useRouter();
  const [riskFilter, setRiskFilter] = useState<RiskBucket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const safeAnalyses = useMemo(() => {
    if (!Array.isArray(analyses)) return [];
    return analyses.filter((a) => a && typeof a === "object");
  }, [analyses]);

  const riskCounts = useMemo(() => {
    const counts: Record<RiskBucket, number> = { high: 0, medium: 0, low: 0 };
    for (const a of safeAnalyses) {
      const b = riskBucket(a?.risk_score ?? null);
      if (b) counts[b]++;
    }
    return counts;
  }, [safeAnalyses]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { completed: 0, failed: 0 };
    for (const a of safeAnalyses) {
      const s = (a?.status ?? "").toLowerCase();
      if (s === "completed" || s === "failed") counts[s]++;
    }
    return counts;
  }, [safeAnalyses]);

  const filtered = useMemo(() => {
    let out = safeAnalyses;
    if (riskFilter) out = out.filter((a) => riskBucket(a?.risk_score ?? null) === riskFilter);
    if (statusFilter) out = out.filter((a) => (a?.status ?? "").toLowerCase() === statusFilter);
    return out;
  }, [safeAnalyses, riskFilter, statusFilter]);

  const RISK_ORDER: RiskBucket[] = ["high", "medium", "low"];
  const RISK_LABEL: Record<RiskBucket, string> = {
    high: L.riskHigh, medium: L.riskMedium, low: L.riskLow,
  };
  const STATUS_ORDER = ["completed", "failed"];
  const STATUS_LABEL: Record<string, string> = {
    completed: L.statusCompleted,
    failed: L.statusFailed,
  };

  const hasFilters = safeAnalyses.length > 0 &&
    (riskCounts.high > 0 || riskCounts.medium > 0 || riskCounts.low > 0 ||
     statusCounts.completed > 0 || statusCounts.failed > 0);

  return (
    <div className="space-y-3">
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Risk chips */}
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

          {/* Separator */}
          <span className="h-4 w-px bg-[color:var(--dg-border)]" aria-hidden />

          {/* Status chips */}
          <button
            onClick={() => setStatusFilter(null)}
            aria-pressed={statusFilter === null}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              statusFilter === null
                ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
                : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
            }`}
          >
            {L.statusAll}
          </button>
          {STATUS_ORDER.filter((s) => statusCounts[s] > 0 || statusFilter === s).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              aria-pressed={statusFilter === s}
              className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
                statusFilter === s
                  ? STATUS_CHIP[s]
                  : `${STATUS_CHIP[s] ?? "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)]"} opacity-50 hover:opacity-100`
              }`}
            >
              {statusCounts[s]} {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((a) => {
            const analysisHref = `/dashboard/${installationId}/analyses/${a.id}`;
            const githubPrHref = a.pr_number && repoFullName
              ? `https://github.com/${repoFullName}/pull/${a.pr_number}`
              : null;
            return (
              <div
                key={a.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(analysisHref)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(analysisHref); }}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition group cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--dg-electric)]"
              >
                <div
                  className={`w-10 h-10 rounded font-mono text-[13px] font-bold flex items-center justify-center shrink-0 ${riskBg(a.risk_score)} ${riskColor(a.risk_score)}`}
                >
                  {a.risk_score ?? "—"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-[color:var(--dg-fg)]">
                      {a.pr_number ? `PR #${a.pr_number}` : L.manualScan}
                    </span>
                    {githubPrHref && (
                      <a
                        href={githubPrHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 font-sans text-[10px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-electric)] transition"
                        aria-label={`Open PR #${a.pr_number} on GitHub`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {a.head_sha ? `${a.head_sha.slice(0, 7)} · ` : ""}
                    {a.date ?? ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {a.policy_verdict && a.policy_verdict !== "pass" && (
                    <span className={`font-sans font-medium text-[9px] uppercase tracking-widest rounded px-1 py-0.5 ${
                      a.policy_verdict === "block"
                        ? "text-blocked bg-blocked/10"
                        : "text-warned bg-warned/10"
                    }`}>
                      {a.policy_verdict}
                    </span>
                  )}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
