"use client";

import { useState, useMemo } from "react";
import type { FinOpsReview } from "@/lib/api";

type RiskBucket = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const RISK_ORDER: RiskBucket[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const RISK_CHIP: Record<RiskBucket, string> = {
  CRITICAL: "text-blocked border-blocked/30 bg-blocked/10",
  HIGH:     "text-orange-500 border-orange-500/30 bg-orange-500/10",
  MEDIUM:   "text-warned border-warned/30 bg-warned/10",
  LOW:      "text-allowed border-allowed/30 bg-allowed/10",
};

const RISK_BADGE: Record<RiskBucket, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  HIGH:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  MEDIUM:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  LOW:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function fmtCents(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

type Labels = {
  filterPlaceholder: string;
  riskAll: string;
  riskCritical: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  noMatch: string;
};

export function FinOpsListClient({
  reviews,
  labels: L,
}: {
  reviews: FinOpsReview[];
  labels: Labels;
}) {
  const [repoFilter, setRepoFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBucket | null>(null);

  const safeReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((r) => r && typeof r === "object");
  }, [reviews]);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const r of safeReviews) {
      const rl = (r?.risk_level ?? "").toUpperCase();
      if (rl in counts) counts[rl]++;
    }
    return counts;
  }, [safeReviews]);

  const filtered = useMemo(() => {
    let out = safeReviews;
    if (riskFilter) out = out.filter((r) => (r?.risk_level ?? "").toUpperCase() === riskFilter);
    const q = repoFilter.trim().toLowerCase();
    if (q) out = out.filter((r) => (r?.repo_full_name ?? "").toLowerCase().includes(q));
    return out;
  }, [safeReviews, riskFilter, repoFilter]);

  const RISK_LABEL: Record<RiskBucket, string> = {
    CRITICAL: L.riskCritical,
    HIGH:     L.riskHigh,
    MEDIUM:   L.riskMedium,
    LOW:      L.riskLow,
  };

  return (
    <div className="space-y-3">
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
      </div>

      <input
        value={repoFilter}
        onChange={(e) => setRepoFilter(e.target.value)}
        placeholder={L.filterPlaceholder}
        aria-label={L.filterPlaceholder}
        className="w-full max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                    {review.repo_full_name}
                  </span>
                  <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                    #{review.pr_number}
                  </span>
                </div>
                {review.terraform_files.length > 0 && (
                  <p className="mt-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                    {review.terraform_files.slice(0, 2).join(", ")}
                    {review.terraform_files.length > 2 &&
                      ` +${review.terraform_files.length - 2} more`}
                  </p>
                )}
              </div>
              <div className="ml-4 flex items-center gap-4 shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_BADGE[(review.risk_level ?? "").toUpperCase() as RiskBucket] ?? RISK_BADGE.LOW}`}
                >
                  {RISK_LABEL[(review.risk_level ?? "").toUpperCase() as RiskBucket] ?? review.risk_level}
                </span>
                <span
                  className={`font-mono text-[12px] font-semibold ${
                    review.delta_monthly_cents > 0
                      ? "text-blocked"
                      : review.delta_monthly_cents < 0
                      ? "text-allowed"
                      : "text-[color:var(--dg-fg-subtle)]"
                  }`}
                >
                  {fmtCents(review.delta_monthly_cents)}/mo
                </span>
                {review.created_at && (
                  <span suppressHydrationWarning className="hidden sm:block font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
