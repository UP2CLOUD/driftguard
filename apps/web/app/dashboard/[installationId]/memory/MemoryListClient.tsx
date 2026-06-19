"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Outcome = "blocked" | "warned" | "approved" | "merged";

const OUTCOME_ORDER: Outcome[] = ["blocked", "warned", "approved", "merged"];

const OUTCOME_CHIP: Record<Outcome, string> = {
  blocked:  "text-blocked border-blocked/30 bg-blocked/10",
  warned:   "text-warned border-warned/30 bg-warned/10",
  approved: "text-allowed border-allowed/30 bg-allowed/10",
  merged:   "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
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
  high:     "text-[color:var(--dg-severity-high,#f97316)]",
  medium:   "text-warned",
  low:      "text-[color:var(--dg-fg-subtle)]",
};

export type MemoryRow = {
  id: string;
  repo_full_name: string | null;
  pr_number: number | null;
  outcome: string | null;
  severity: string | null;
  blast_radius: string | null;
  intent_text: string | null;
  analysis_id: string | null;
  date: string | null;
};

type Labels = {
  filterPlaceholder: string;
  outcomeAll: string;
  outcomeBlocked: string;
  outcomeApproved: string;
  outcomeWarned: string;
  outcomeMerged: string;
  noMatch: string;
  viewAnalysis: string;
};

export function MemoryListClient({
  entries,
  installationId,
  labels: L,
}: {
  entries: MemoryRow[];
  installationId: string;
  labels: Labels;
}) {
  const [repoFilter, setRepoFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome | null>(null);

  const safeEntries = useMemo(() => {
    if (!Array.isArray(entries)) return [];
    return entries.filter((e) => e && typeof e === "object");
  }, [entries]);

  const outcomeCounts = useMemo(() => {
    const counts: Record<string, number> = { blocked: 0, warned: 0, approved: 0, merged: 0 };
    for (const e of safeEntries) {
      const o = (e?.outcome ?? "").toLowerCase();
      if (o in counts) counts[o]++;
    }
    return counts;
  }, [safeEntries]);

  const filtered = useMemo(() => {
    let out = safeEntries;
    if (outcomeFilter) out = out.filter((e) => (e?.outcome ?? "").toLowerCase() === outcomeFilter);
    const q = repoFilter.trim().toLowerCase();
    if (q) out = out.filter((e) => (e?.repo_full_name ?? "").toLowerCase().includes(q));
    return out;
  }, [safeEntries, outcomeFilter, repoFilter]);

  const OUTCOME_LABEL: Record<Outcome, string> = {
    blocked:  L.outcomeBlocked,
    warned:   L.outcomeWarned,
    approved: L.outcomeApproved,
    merged:   L.outcomeMerged,
  };

  if (safeEntries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOutcomeFilter(null)}
          aria-pressed={outcomeFilter === null}
          className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
            outcomeFilter === null
              ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
              : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
          }`}
        >
          {L.outcomeAll}
        </button>
        {OUTCOME_ORDER.filter((o) => outcomeCounts[o] > 0 || outcomeFilter === o).map((o) => (
          <button
            key={o}
            onClick={() => setOutcomeFilter(outcomeFilter === o ? null : o)}
            aria-pressed={outcomeFilter === o}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              outcomeFilter === o
                ? OUTCOME_CHIP[o]
                : `${OUTCOME_CHIP[o]} opacity-50 hover:opacity-100`
            }`}
          >
            {outcomeCounts[o]} {OUTCOME_LABEL[o]}
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
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={e.analysis_id ? `/dashboard/${installationId}/analyses/${e.analysis_id}` : "#"}
              className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <code className="font-mono text-[12px] text-[color:var(--dg-fg)]">
                    {e.repo_full_name}
                    {e.pr_number != null ? (
                      <span className="text-[color:var(--dg-fg-muted)]">#{e.pr_number}</span>
                    ) : null}
                  </code>
                  {e.outcome && (
                    <span
                      className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${
                        OUT_BADGE[e.outcome.toLowerCase()] ?? "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)]"
                      }`}
                    >
                      {e.outcome}
                    </span>
                  )}
                  {e.severity && (
                    <span
                      className={`font-sans font-medium text-[10px] uppercase tracking-widest ${
                        SEV_COLOR[e.severity.toLowerCase()] ?? ""
                      }`}
                    >
                      {e.severity}
                    </span>
                  )}
                  {e.blast_radius && (
                    <span
                      className={`font-sans font-medium text-[10px] uppercase tracking-widest ${
                        BLAST_COLOR[e.blast_radius.toLowerCase()] ?? ""
                      }`}
                    >
                      blast:{e.blast_radius}
                    </span>
                  )}
                </div>
                {e.intent_text && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] line-clamp-2 mb-1.5">
                    {e.intent_text}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  {e.date && (
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                      {e.date}
                    </span>
                  )}
                  {e.analysis_id && (
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)]">
                      {L.viewAnalysis}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
