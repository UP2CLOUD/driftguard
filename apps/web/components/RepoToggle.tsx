"use client";

import { useState } from "react";

export function RepoToggle({
  repoId,
  initialEnabled,
  atFreeLimit,
  labels,
}: {
  repoId: string;
  initialEnabled: boolean;
  atFreeLimit: boolean;
  labels?: {
    enable?: string;
    disable?: string;
    repoLimitReached?: string;
    planLimitReached?: string;
    toggleFailed?: string;
    networkError?: string;
  };
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (loading) return;
    const action = enabled ? "disable" : "enable";

    if (!enabled && atFreeLimit) {
      setError(labels?.repoLimitReached ?? "Repo limit reached. Disable another repo or upgrade.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setError(body.detail ?? body.error ?? (labels?.planLimitReached ?? "Plan limit reached. Upgrade to add more repositories."));
        } else {
          setError(body.detail ?? body.error ?? (labels?.toggleFailed ?? "Failed to {action} repository.").replace("{action}", action));
        }
        return;
      }
      setEnabled(!enabled);
    } catch {
      setError(labels?.networkError ?? "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`font-sans font-medium text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition disabled:opacity-40 ${
          enabled
            ? "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)] hover:text-blocked hover:border-blocked/40"
            : "text-[color:var(--dg-electric)] border-[color:var(--dg-electric)]/30 hover:bg-[color:var(--dg-electric)]/5"
        }`}
      >
        {loading ? "…" : enabled ? (labels?.disable ?? "Disable") : (labels?.enable ?? "Enable")}
      </button>
      {error && (
        <p className="font-sans font-medium text-[10px] text-warned text-right max-w-[160px] leading-tight">{error}</p>
      )}
    </div>
  );
}
