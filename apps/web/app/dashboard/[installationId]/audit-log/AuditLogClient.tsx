"use client";

import { useState, useMemo } from "react";
import type { AuditEntry } from "./page";

type Labels = Record<
  | "filterPlaceholder" | "showing" | "of" | "events" | "actor"
  | "action" | "target" | "time" | "payload" | "noMatch",
  string
>;

export function AuditLogClient({
  entries,
  actionColors,
  labels: L,
}: {
  entries: AuditEntry[];
  actionColors: Record<string, string>;
  labels: Labels;
}) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter(
      (e) =>
        e.actor?.toLowerCase().includes(q) ||
        e.action?.toLowerCase().includes(q) ||
        e.target?.toLowerCase().includes(q)
    );
  }, [entries, filter]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="space-y-3">
      {/* Filter + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={L.filterPlaceholder}
          className="flex-1 min-w-[240px] rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
          {L.showing} {filtered.length} {L.of} {entries.length} {L.events}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_160px_32px] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-2">
          {[L.actor, L.action, L.target, L.time, ""].map((h) => (
            <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[color:var(--dg-fg-muted)] text-center">{L.noMatch}</p>
        ) : (
          <div className="divide-y divide-[color:var(--dg-border)]">
            {filtered.map((e) => {
              const hasPayload = e.payload && Object.keys(e.payload).length > 0;
              const isOpen = expanded.has(e.id);
              const actionCls = actionColors[e.action] ?? "text-[color:var(--dg-fg-muted)]";
              const ts = e.created_at ? new Date(e.created_at) : null;

              return (
                <div key={e.id}>
                  <div className="sm:grid grid-cols-[1fr_1fr_1fr_160px_32px] flex flex-wrap gap-2 px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition">
                    <span className="font-mono text-[11px] text-[color:var(--dg-fg)] truncate">{e.actor ?? "—"}</span>
                    <span className={`font-mono text-[11px] truncate ${actionCls}`}>{e.action ?? "—"}</span>
                    <span className="font-mono text-[11px] text-[color:var(--dg-fg-muted)] truncate">{e.target ?? "—"}</span>
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
                      {ts ? ts.toLocaleString() : "—"}
                    </span>
                    {hasPayload ? (
                      <button
                        onClick={() => toggle(e.id)}
                        aria-expanded={isOpen}
                        className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-electric)] transition select-none"
                        title={L.payload}
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                  {isOpen && hasPayload && (
                    <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-4 py-3">
                      <pre className="font-mono text-[10px] text-[color:var(--dg-fg-muted)] overflow-x-auto leading-relaxed">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
