"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_STYLE: Record<string, string> = {
  block: "text-blocked border-blocked/30 bg-blocked/5",
  warn: "text-warned border-warned/30 bg-warned/5",
  alert: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
};

const RULE_TYPES = ["block", "warn", "alert"];
const SEVERITIES = ["critical", "high", "medium", "low"];

export function PolicyCard({ policy, installationId }: { policy: any; installationId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState<"toggle" | "save" | "delete" | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: policy.name ?? "",
    rule_type: policy.rule_type ?? "block",
    severity: policy.severity ?? "high",
    description: policy.description ?? "",
    conditions: (policy.conditions ?? {}) as Record<string, string>,
  });
  const [condKey, setCondKey] = useState("");
  const [condVal, setCondVal] = useState("");

  async function patch(body: object) {
    const res = await fetch(`/api/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail || "Request failed");
    }
    return res.json();
  }

  async function toggleEnabled() {
    setLoading("toggle");
    setError("");
    try {
      await patch({ enabled: !policy.enabled });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function saveEdit() {
    setLoading("save");
    setError("");
    try {
      await patch({
        name: form.name,
        rule_type: form.rule_type,
        severity: form.severity,
        description: form.description || undefined,
        conditions: Object.keys(form.conditions).length > 0 ? form.conditions : undefined,
      });
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function deletePol() {
    setLoading("delete");
    setError("");
    try {
      const res = await fetch(`/api/policies/${policy.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  function addCondition() {
    if (!condKey.trim()) return;
    setForm((f) => ({ ...f, conditions: { ...f.conditions, [condKey.trim()]: condVal.trim() } }));
    setCondKey(""); setCondVal("");
  }

  function removeCondition(k: string) {
    setForm((f) => { const c = { ...f.conditions }; delete c[k]; return { ...f, conditions: c }; });
  }

  if (editing) {
    return (
      <div className="px-4 py-4 bg-[color:var(--dg-surface-raised)]">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">Edit policy</span>
          <button onClick={() => setEditing(false)} className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition">Cancel</button>
        </div>
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Policy name"
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}
              className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none"
            >
              {RULE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none"
            >
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none"
          />
          {/* Conditions */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1.5">Conditions</p>
            {Object.entries(form.conditions).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1.5">
                <code className="flex-1 font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-canvas)] border border-[color:var(--dg-border)] rounded px-2 py-1">
                  {k} = {v}
                </code>
                <button type="button" onClick={() => removeCondition(k)} className="font-mono text-[10px] text-blocked">×</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={condKey} onChange={(e) => setCondKey(e.target.value)} placeholder="key"
                className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none" />
              <input value={condVal} onChange={(e) => setCondVal(e.target.value)} placeholder="value"
                className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none" />
              <button type="button" onClick={addCondition}
                className="rounded border border-[color:var(--dg-border)] px-3 font-mono text-[11px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition">+</button>
            </div>
          </div>
          {error && <p className="font-mono text-[11px] text-blocked">✗ {error}</p>}
          <button
            onClick={saveEdit}
            disabled={loading === "save"}
            className="w-full rounded bg-[color:var(--dg-electric)] py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 transition"
          >
            {loading === "save" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition group">
      {/* Enabled dot */}
      <div className="mt-1 shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full inline-block ${policy.enabled ? "bg-allowed" : "bg-[color:var(--dg-fg-subtle)]"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${TYPE_STYLE[policy.rule_type] ?? ""}`}>
            {policy.rule_type}
          </span>
          <span className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)]">{policy.name}</span>
          {!policy.enabled && (
            <span className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)]">disabled</span>
          )}
        </div>
        {policy.description && (
          <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-1.5">{policy.description}</p>
        )}
        <div className="flex items-center gap-4 flex-wrap font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          {policy.conditions && (
            <span className="truncate max-w-xs">
              if {Object.entries(policy.conditions as Record<string, string>).map(([k, v]) => `${k}=${v}`).join(" · ")}
            </span>
          )}
          {policy.match_count > 0 && (
            <span className="text-warned shrink-0">↺ {policy.match_count} matches</span>
          )}
        </div>
        {error && <p className="font-mono text-[11px] text-blocked mt-1">✗ {error}</p>}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        {/* Toggle enable/disable */}
        <button
          onClick={toggleEnabled}
          disabled={loading === "toggle"}
          title={policy.enabled ? "Disable" : "Enable"}
          className="rounded border border-[color:var(--dg-border)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 disabled:opacity-40 transition"
        >
          {loading === "toggle" ? "…" : policy.enabled ? "Disable" : "Enable"}
        </button>

        {/* Edit */}
        <button
          onClick={() => setEditing(true)}
          className="rounded border border-[color:var(--dg-border)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
        >
          Edit
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={deletePol}
              disabled={loading === "delete"}
              className="rounded border border-blocked/30 bg-blocked/5 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-blocked hover:bg-blocked/10 disabled:opacity-40 transition"
            >
              {loading === "delete" ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-[color:var(--dg-border)] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-muted)] hover:text-blocked hover:border-blocked/30 transition"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
