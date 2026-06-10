"use client";

import { useState, useTransition } from "react";
import { recallMemory, type RecallHit } from "./actions";

type Labels = Record<
  | "placeholder" | "search" | "searching" | "noResults" | "tooShort"
  | "error" | "similarity" | "hint",
  string
>;

const OUT_BADGE: Record<string, string> = {
  blocked:  "border-blocked/30 bg-blocked/5 text-blocked",
  approved: "border-allowed/30 bg-allowed/5 text-allowed",
  warned:   "border-warned/30 bg-warned/5 text-warned",
  merged:   "border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5 text-[color:var(--dg-electric-bright)]",
};

export function MemorySearch({
  installationId,
  labels: L,
}: {
  installationId: string;
  labels: Labels;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RecallHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    const q = query.trim();
    setError(null);
    if (q.length < 3) {
      setError(L.tooShort);
      setHits(null);
      return;
    }
    startTransition(async () => {
      const res = await recallMemory(installationId, q);
      if (!res.ok) {
        setError(L.error);
        setHits(null);
        return;
      }
      setHits(res.hits);
    });
  };

  return (
    <div className="mb-6 rounded-md border border-[color:var(--dg-border)] overflow-hidden">
      <div className="flex gap-2 p-3 bg-[color:var(--dg-surface)] border-b border-[color:var(--dg-border)]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !pending && run()}
          placeholder={L.placeholder}
          className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[13px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        <button
          onClick={run}
          disabled={pending}
          className="dg-button dg-button-primary text-[12px] px-4 disabled:opacity-50"
        >
          {pending ? L.searching : L.search}
        </button>
      </div>

      {error && (
        <p className="px-4 py-3 font-mono text-[11px] text-warned">{error}</p>
      )}

      {hits !== null && !error && (
        hits.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-[color:var(--dg-fg-muted)]">
            {L.noResults}
          </p>
        ) : (
          <div className="divide-y divide-[color:var(--dg-border)]">
            {hits.map((h) => {
              const pct = Math.round(h.similarity * 100);
              return (
                <div key={h.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">
                      {h.repo_full_name}#{h.pr_number}
                    </code>
                    <span className={`font-mono text-[9px] uppercase tracking-widest rounded border px-1.5 py-0.5 ${OUT_BADGE[h.outcome] ?? "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)]"}`}>
                      {h.outcome}
                    </span>
                    {h.severity && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                        {h.severity}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      <span className="h-1 w-16 rounded-full bg-[color:var(--dg-border)] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-[color:var(--dg-electric)]"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-[color:var(--dg-fg-subtle)]">
                        {pct}% {L.similarity}
                      </span>
                    </span>
                  </div>
                  {h.intent_text && (
                    <p className="text-[12px] text-[color:var(--dg-fg-muted)] line-clamp-2">
                      {h.intent_text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {hits === null && !error && (
        <p className="px-4 py-3 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          {L.hint}
        </p>
      )}
    </div>
  );
}
