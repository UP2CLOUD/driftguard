"use client";

import { useState } from "react";

export function RepoToggle({
  repoId,
  initialEnabled,
  atFreeLimit,
}: {
  repoId: string;
  initialEnabled: boolean;
  atFreeLimit: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (loading) return;
    const action = enabled ? "disable" : "enable";

    if (!enabled && atFreeLimit) {
      setError("Repo limit reached. Disable another repo or upgrade.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setError(body.detail ?? body.error ?? "Plan limit reached. Upgrade to add more repositories.");
        } else {
          setError(body.detail ?? body.error ?? `Failed to ${action} repository.`);
        }
        return;
      }
      setEnabled(!enabled);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition disabled:opacity-40 ${
          enabled
            ? "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)] hover:text-blocked hover:border-blocked/40"
            : "text-[color:var(--dg-electric)] border-[color:var(--dg-electric)]/30 hover:bg-[color:var(--dg-electric)]/5"
        }`}
      >
        {loading ? "…" : enabled ? "Disable" : "Enable"}
      </button>
      {error && (
        <p className="font-mono text-[9px] text-warned text-right max-w-[160px] leading-tight">{error}</p>
      )}
    </div>
  );
}
