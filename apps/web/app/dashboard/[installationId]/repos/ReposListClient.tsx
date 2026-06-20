"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RepoToggle } from "@/components/RepoToggle";
import { RepoQuickScan } from "@/components/dashboard/RepoQuickScan";

type RiskBucket = "high" | "medium" | "low";

export type RepoRow = {
  id: string | null;
  full_name: string;
  default_branch: string | null;
  enabled: boolean;
  riskScore: number | null;
  lastDate: string | null;
  lastAnalysisId: string | null;
  atFreeLimit: boolean;
};

type Labels = {
  filterPlaceholder: string;
  riskAll: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  showing: string;
  of: string;
  repos: string;
  noMatch: string;
  colRepo: string;
  colRisk: string;
  colLastAnalyzed: string;
  colStatus: string;
  colActive: string;
  viewLatest: string;
  never: string;
  quickScan: string;
  quickScanQueuing: string;
  quickScanScanning: string;
  quickScanDone: string;
  quickScanFailed: string;
  enable: string;
  disable: string;
  repoLimitReached: string;
  planLimitReached: string;
  toggleFailed: string;
  networkError: string;
};

function riskBucket(score: number | null): RiskBucket | null {
  if (score == null) return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
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

const RISK_CHIP: Record<string, string> = {
  high:   "text-blocked border-blocked/30 bg-blocked/10",
  medium: "text-warned border-warned/30 bg-warned/10",
  low:    "text-allowed border-allowed/30 bg-allowed/10",
};

export function ReposListClient({
  rows,
  installationId,
  labels: L,
}: {
  rows: RepoRow[];
  installationId: string;
  labels: Labels;
}) {
  const [repoFilter, setRepoFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBucket | null>(null);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    for (const r of rows) {
      const b = riskBucket(r.riskScore);
      if (b) counts[b]++;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (riskFilter) out = out.filter((r) => riskBucket(r.riskScore) === riskFilter);
    const query = repoFilter.trim().toLowerCase();
    if (query) {
      out = out.filter((r) => r.full_name.toLowerCase().includes(query));
    }
    return out;
  }, [rows, riskFilter, repoFilter]);

  const isFiltered = !!repoFilter.trim() || !!riskFilter;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
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
        {(["high", "medium", "low"] as const).filter((b) => riskCounts[b] > 0 || riskFilter === b).map((b) => (
          <button
            key={b}
            onClick={() => setRiskFilter(riskFilter === b ? null : b)}
            aria-pressed={riskFilter === b}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              riskFilter === b ? RISK_CHIP[b] : `${RISK_CHIP[b]} opacity-50 hover:opacity-100`
            }`}
          >
            {riskCounts[b]} {b === "high" ? L.riskHigh : b === "medium" ? L.riskMedium : L.riskLow}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          placeholder={L.filterPlaceholder}
          aria-label={L.filterPlaceholder}
          className="flex-1 min-w-[220px] max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        {isFiltered && (
          <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
            {L.showing} {filtered.length} {L.of} {rows.length} {L.repos}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_90px] gap-4 bg-[color:var(--dg-surface)] px-4 py-2">
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{L.colRepo}</span>
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{L.colRisk}</span>
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{L.colLastAnalyzed}</span>
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{L.colStatus}</span>
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{L.colActive}</span>
          </div>

          {filtered.map((r) => (
            <div
              key={r.full_name}
              className="flex sm:grid sm:grid-cols-[1fr_80px_100px_100px_90px] items-center gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              {/* Repo name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${r.enabled ? "bg-allowed" : "bg-[color:var(--dg-fg-subtle)]"}`} />
                <div className="min-w-0">
                  <code className={`font-mono text-[12px] truncate block ${r.enabled ? "text-[color:var(--dg-fg)]" : "text-[color:var(--dg-fg-muted)]"}`}>
                    {r.full_name}
                  </code>
                  <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {r.default_branch ?? "main"}
                  </span>
                </div>
              </div>

              {/* Risk score */}
              <div className={`hidden sm:flex w-12 h-8 rounded font-mono text-[12px] font-bold items-center justify-center ${riskBg(r.riskScore)} ${riskColor(r.riskScore)}`}>
                {r.riskScore ?? "—"}
              </div>

              {/* Last analyzed */}
              <div className="hidden sm:block font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                {r.lastDate ?? L.never}
              </div>

              {/* View latest / quick scan */}
              <div className="hidden sm:flex items-center gap-2">
                {r.lastAnalysisId ? (
                  <Link
                    href={`/dashboard/${installationId}/analyses/${r.lastAnalysisId}`}
                    className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                  >
                    {L.viewLatest}
                  </Link>
                ) : (
                  <RepoQuickScan
                    installationId={installationId}
                    repoFullName={r.full_name}
                    labels={{
                      scan:     L.quickScan,
                      queuing:  L.quickScanQueuing,
                      scanning: L.quickScanScanning,
                      done:     L.quickScanDone,
                      failed:   L.quickScanFailed,
                    }}
                  />
                )}
              </div>

              {/* Active toggle */}
              <div className="hidden sm:flex items-center">
                {r.id ? (
                  <RepoToggle
                    repoId={r.id}
                    initialEnabled={r.enabled}
                    atFreeLimit={r.atFreeLimit}
                    labels={{
                      enable:           L.enable,
                      disable:          L.disable,
                      repoLimitReached: L.repoLimitReached,
                      planLimitReached: L.planLimitReached,
                      toggleFailed:     L.toggleFailed,
                      networkError:     L.networkError,
                    }}
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-allowed" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
