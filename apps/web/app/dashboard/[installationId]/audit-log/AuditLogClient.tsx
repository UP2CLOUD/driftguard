"use client";

import { useState, useMemo } from "react";
import type { AuditEntry } from "./page";

type Labels = Record<
  | "filterPlaceholder" | "showing" | "of" | "events" | "actor"
  | "action" | "target" | "time" | "payload" | "noMatch" | "actionAll",
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
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const actionTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries) {
      if (e.action) seen.add(e.action);
    }
    return Array.from(seen).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let out = entries;
    if (actionFilter) out = out.filter((e) => e.action === actionFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      out = out.filter(
        (e) =>
          e.actor?.toLowerCase()?.includes(q) ||
          e.action?.toLowerCase()?.includes(q) ||
          e.target?.toLowerCase()?.includes(q)
      );
    }
    return out;
  }, [entries, filter, actionFilter]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="space-y-3">
      {/* Action-type chips */}
      {actionTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActionFilter(null)}
            aria-pressed={actionFilter === null}
            className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer ${
              actionFilter === null
                ? "border-[color:var(--dg-electric)] text-[color:var(--dg-fg)] bg-[color:var(--dg-electric)]/10"
                : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
            }`}
          >
            {L.actionAll}
          </button>
          {actionTypes.map((a) => {
            const cls = actionColors[a] ?? "text-[color:var(--dg-fg-muted)]";
            const isActive = actionFilter === a;
            const isAnyActive = actionFilter !== null;
            return (
              <button
                key={a}
                onClick={() => setActionFilter(isActive ? null : a)}
                aria-pressed={isActive}
                className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition cursor-pointer border-[color:var(--dg-border)] ${cls} ${
                  isActive
                    ? "opacity-100 bg-[color:var(--dg-surface)]"
                    : isAnyActive
                    ? "opacity-40 hover:opacity-100"
                    : "opacity-100"
                }`}
              >
                {a}
              </button>
            );
          })}
        </div>
      )}

      {/* Text filter + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={L.filterPlaceholder}
          className="flex-1 min-w-[240px] rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] placeholder:text-[color:var(--dg-fg-subtle)]"
        />
        <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
          {L.showing} {filtered.length} {L.of} {entries.length} {L.events}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_160px_32px] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-2">
          {[L.actor, L.action, L.target, L.time, ""].map((h) => (
            <span key={h} className="font-sans font-medium text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
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
                    <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] shrink-0">
                      {ts ? ts.toLocaleString() : "—"}
                    </span>
                    {hasPayload ? (
                      <button
                        onClick={() => toggle(e.id)}
                        aria-expanded={isOpen}
                        className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-electric)] transition select-none"
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
