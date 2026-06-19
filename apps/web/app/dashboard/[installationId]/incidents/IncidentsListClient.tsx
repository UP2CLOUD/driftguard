"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";

type SevBucket = "critical" | "high" | "medium" | "low";

type Labels = {
  filterPlaceholder: string;
  sevAll: string;
  sevCritical: string;
  sevHigh: string;
  sevMedium: string;
  sevLow: string;
  noMatch: string;
  suggestedFixInline: string;
  recurrenceBadge: string;
};

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  recurrence_count?: number | null;
  last_seen_at?: string | null;
  suggested_fix?: string | null;
}

const SEV_CHIP: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/10",
  high: "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/10",
  medium: "text-warned border-warned/30 bg-warned/10",
  low: "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]",
};

const SEV_BADGE: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/5",
  high: "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/5",
  medium: "text-warned border-warned/30 bg-warned/5",
  low: "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)]",
};

const STATUS_DOT: Record<string, string> = {
  open: "bg-blocked",
  investigating: "bg-warned",
  resolved: "bg-allowed",
  suppressed: "bg-[color:var(--dg-fg-subtle)]",
};

const STATUS_BADGE: Record<string, string> = {
  open: "text-blocked border-blocked/30 bg-blocked/5",
  investigating: "text-warned border-warned/30 bg-warned/5",
  resolved: "text-allowed border-allowed/30 bg-allowed/5",
  suppressed: "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]",
};

const SEV_ORDER: SevBucket[] = ["critical", "high", "medium", "low"];

export function IncidentsListClient({
  incidents,
  installationId,
  locale,
  labels: L,
}: {
  incidents: Incident[];
  installationId: string;
  locale: string;
  labels: Labels;
}) {
  const [titleFilter, setTitleFilter] = useState("");
  const [sevFilter, setSevFilter] = useState<SevBucket | null>(null);

  const sevCounts = useMemo(() => {
    const counts: Record<SevBucket, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const inc of incidents) {
      const s = (inc.severity ?? "").toLowerCase();
      if (s === "critical" || s === "high" || s === "medium" || s === "low") {
        counts[s as SevBucket]++;
      }
    }
    return counts;
  }, [incidents]);

  const filtered = useMemo(() => {
    let out = incidents;
    if (sevFilter) out = out.filter((inc) => (inc.severity ?? "").toLowerCase() === sevFilter);
    const q = titleFilter.trim().toLowerCase();
    if (q) out = out.filter((inc) => (inc.title ?? "").toLowerCase().includes(q));
    return out;
  }, [incidents, sevFilter, titleFilter]);

  const SEV_LABEL: Record<string, string> = {
    critical: L.sevCritical,
    high: L.sevHigh,
    medium: L.sevMedium,
    low: L.sevLow,
  };

  return (
    <div className="space-y-3">
      {/* Severity chips + title search */}
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
              sevFilter === s
                ? SEV_CHIP[s]
                : `${SEV_CHIP[s]} opacity-50 hover:opacity-100`
            }`}
          >
            {sevCounts[s]} {SEV_LABEL[s]}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={titleFilter}
        onChange={(e) => setTitleFilter(e.target.value)}
        placeholder={L.filterPlaceholder}
        aria-label={L.filterPlaceholder}
        className="w-full max-w-sm rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-sans text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{L.noMatch}</p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {filtered.map((inc) => (
            <Link
              key={inc.id}
              href={`/dashboard/${installationId}/incidents/${inc.id}`}
              className="flex items-start gap-3 sm:gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <div className="mt-1.5 sm:mt-2 shrink-0">
                <span
                  className={`h-2 w-2 rounded-full inline-block ${STATUS_DOT[inc.status] ?? "bg-[color:var(--dg-fg-subtle)]"}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap mb-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest shrink-0 ${SEV_BADGE[(inc.severity ?? "").toLowerCase()] ?? ""}`}
                  >
                    {inc.severity}
                  </span>
                  <span className="font-sans text-[14px] sm:text-[13px] font-medium leading-snug text-[color:var(--dg-fg)] break-words min-w-0">
                    {inc.title}
                  </span>
                </div>

                {inc.description && (
                  <p className="text-[13px] sm:text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-2.5 line-clamp-3 sm:line-clamp-2 break-words">
                    {inc.description}
                  </p>
                )}

                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest shrink-0 ${STATUS_BADGE[inc.status] ?? ""}`}
                  >
                    {inc.status}
                  </span>
                  {(inc.recurrence_count ?? 0) > 1 && (
                    <span className="font-mono text-[11px] sm:text-[10px] text-warned shrink-0">
                      {L.recurrenceBadge.replace("{n}", String(inc.recurrence_count))}
                    </span>
                  )}
                  {inc.last_seen_at && (
                    <span className="font-mono text-[11px] sm:text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
                      {formatDate(inc.last_seen_at, locale)}
                    </span>
                  )}
                </div>

                {inc.suggested_fix && (
                  <div className="mt-3 rounded border border-allowed/20 bg-allowed/5 px-3 py-2.5">
                    <span className="block sm:inline font-sans font-medium text-[10px] uppercase tracking-widest text-allowed mb-1 sm:mb-0 sm:mr-2">
                      {L.suggestedFixInline}
                    </span>
                    <span className="font-mono text-[12px] sm:text-[11px] leading-relaxed text-allowed break-words [overflow-wrap:anywhere]">
                      {inc.suggested_fix}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
