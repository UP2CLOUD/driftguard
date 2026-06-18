"use client";

import { useState, useMemo } from "react";
import { PolicyCard } from "@/components/PolicyCard";

type RuleType = "block" | "warn" | "alert";

const TYPE_CHIP: Record<string, string> = {
  block: "text-blocked border-blocked/30 bg-blocked/10",
  warn:  "text-warned border-warned/30 bg-warned/10",
  alert: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
};

type Labels = {
  filterPlaceholder: string;
  typeAll: string;
  typeBlock: string;
  typeWarn: string;
  typeAlert: string;
  noMatch: string;
};

export function PoliciesListClient({
  policies,
  installationId,
  labels: L,
}: {
  policies: any[];
  installationId: string;
  labels: Labels;
}) {
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<RuleType | null>(null);

  const safePolicies = useMemo(() => {
    if (!Array.isArray(policies)) return [];
    return policies.filter((p) => p && typeof p === "object");
  }, [policies]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { block: 0, warn: 0, alert: 0 };
    for (const p of safePolicies) {
      const rt = (p?.rule_type ?? "").toLowerCase();
      if (rt in counts) counts[rt]++;
    }
    return counts;
  }, [safePolicies]);

  const filtered = useMemo(() => {
    let out = safePolicies;
    if (typeFilter) out = out.filter((p) => (p?.rule_type ?? "").toLowerCase() === typeFilter);
    const q = nameFilter.trim().toLowerCase();
    if (q) out = out.filter((p) => (p?.name ?? "").toLowerCase().includes(q));
    return out;
  }, [safePolicies, typeFilter, nameFilter]);

  const TYPE_ORDER: RuleType[] = ["block", "warn", "alert"];
  const TYPE_LABEL: Record<string, string> = {
    block: L.typeBlock,
    warn:  L.typeWarn,
    alert: L.typeAlert,
  };

  return (
    <div className="space-y-3">
      {/* Type chips + search */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTypeFilter(null)}
          aria-pressed={typeFilter === null}
          className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
            typeFilter === null
              ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
              : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
          }`}
        >
          {L.typeAll}
        </button>
        {TYPE_ORDER.filter((rt) => typeCounts[rt] > 0 || typeFilter === rt).map((rt) => (
          <button
            key={rt}
            onClick={() => setTypeFilter(typeFilter === rt ? null : rt)}
            aria-pressed={typeFilter === rt}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              typeFilter === rt
                ? TYPE_CHIP[rt]
                : `${TYPE_CHIP[rt]} opacity-50 hover:opacity-100`
            }`}
          >
            {typeCounts[rt]} {TYPE_LABEL[rt]}
          </button>
        ))}
      </div>

      <input
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
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
          {filtered.map((p: any) => (
            <PolicyCard key={p.id} policy={p} installationId={installationId} />
          ))}
        </div>
      )}
    </div>
  );
}
