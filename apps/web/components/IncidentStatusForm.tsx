"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "open",          label: "Open",          cls: "border-blocked/30 bg-blocked/5 text-blocked" },
  { value: "investigating", label: "Investigating",  cls: "border-warned/30 bg-warned/5 text-warned" },
  { value: "resolved",      label: "Resolved",       cls: "border-allowed/30 bg-allowed/5 text-allowed" },
  { value: "suppressed",    label: "Suppress",       cls: "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-subtle)]" },
];

export function IncidentStatusForm({
  incidentId,
  currentStatus,
  currentRootCause,
  currentSuggestedFix,
}: {
  incidentId: string;
  currentStatus: string;
  currentRootCause: string;
  currentSuggestedFix: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [rootCause, setRootCause] = useState(currentRootCause);
  const [suggestedFix, setSuggestedFix] = useState(currentSuggestedFix);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          root_cause: rootCause || undefined,
          suggested_fix: suggestedFix || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to update incident");
      }
      setSaved(true);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
      >
        Update status
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
          Update status
        </span>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
        >
          Cancel
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Status selector */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                  status === s.value
                    ? s.cls
                    : "border-[color:var(--dg-border)] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Root cause */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            Root cause
          </label>
          <textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            placeholder="Describe the root cause…"
            rows={3}
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition resize-none"
          />
        </div>

        {/* Suggested fix */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            Suggested fix
          </label>
          <textarea
            value={suggestedFix}
            onChange={(e) => setSuggestedFix(e.target.value)}
            placeholder="Describe the fix…"
            rows={2}
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition resize-none"
          />
        </div>

        {error && <p className="font-mono text-[11px] text-blocked">✗ {error}</p>}
        {saved && <p className="font-mono text-[11px] text-allowed">✓ Saved</p>}

        <button
          onClick={save}
          disabled={loading}
          className="w-full rounded bg-[color:var(--dg-electric)] py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
