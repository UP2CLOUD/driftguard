"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

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
  const t = useT();
  const STATUSES = [
    { value: "open",          label: t("incidents.open"),          cls: "border-blocked/30 bg-blocked/5 text-blocked" },
    { value: "investigating", label: t("incidents.investigating"),  cls: "border-warned/30 bg-warned/5 text-warned" },
    { value: "resolved",      label: t("incidents.resolved"),       cls: "border-allowed/30 bg-allowed/5 text-allowed" },
    { value: "suppressed",    label: t("incidents.suppressLabel"),  cls: "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-subtle)]" },
  ];
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
        signal: AbortSignal.timeout(10000),
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
        className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
      >
        {t("incidents.updateStatus")}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
          {t("incidents.updateStatus")}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
        >
          {t("common.cancel")}
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Status selector */}
        <div>
          <label className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-2">
            {t("incidents.status")}
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest transition ${
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
          <label className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            {t("incidents.rootCause")}
          </label>
          <textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            placeholder={t("incidents.rootCausePlaceholder")}
            rows={3}
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition resize-none"
          />
        </div>

        {/* Suggested fix */}
        <div>
          <label className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            {t("incidents.suggestedFixLabel")}
          </label>
          <textarea
            value={suggestedFix}
            onChange={(e) => setSuggestedFix(e.target.value)}
            placeholder={t("incidents.suggestedFixPlaceholder")}
            rows={2}
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition resize-none"
          />
        </div>

        {error && <p className="font-mono text-[11px] text-blocked">✗ {error}</p>}
        {saved && <p className="font-mono text-[11px] text-allowed">✓ {t("incidents.saved")}</p>}

        <button
          onClick={save}
          disabled={loading}
          className="w-full rounded bg-[color:var(--dg-electric)] py-2 font-sans font-semibold text-[11px] uppercase tracking-wide text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? t("incidents.saving") : t("incidents.saveChanges")}
        </button>
      </div>
    </div>
  );
}
