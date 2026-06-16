"use client";

import { useT } from "@/components/I18nProvider";

import { useState } from "react";
import type { Finding } from "@/lib/api";

const SEV_STYLE: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/10",
  high:     "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/10",
  medium:   "text-warned border-warned/30 bg-warned/10",
  low:      "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-blocked",
  high:     "bg-[color:var(--dg-severity-high)]",
  medium:   "bg-warned",
  low:      "bg-[color:var(--dg-fg-subtle)]",
};

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const t = useT();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  if (findings.length === 0) {
    return (
      <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-10 text-center">
        <span className="text-2xl">✓</span>
        <p className="mt-3 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("dashboard.findingsEmpty")}
        </p>
      </div>
    );
  }

  const copy = (i: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[90px_1fr_1fr_80px] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] gap-4">
        <span>{t("dashboard.severity")}</span>
        <span>{t("dashboard.resource")}</span>
        <span>{t("dashboard.message")}</span>
        <span>{t("dashboard.findingsType")}</span>
      </div>

      <div className="divide-y divide-[color:var(--dg-border)]">
        {findings.map((f, i) => (
          <div key={i}>
            {/* Row */}
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className={`w-full text-left grid grid-cols-1 sm:grid-cols-[90px_1fr_1fr_80px] gap-2 sm:gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-[color:var(--dg-surface-raised)] ${
                expanded === i ? "bg-[color:var(--dg-surface-raised)]" : "bg-[color:var(--dg-surface)]"
              }`}
            >
              {/* Severity */}
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEV_DOT[f.severity] ?? "bg-[color:var(--dg-fg-subtle)]"}`} />
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest ${SEV_STYLE[f.severity] ?? ""}`}>
                  {f.severity}
                </span>
              </div>

              {/* Resource */}
              <div className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate min-w-0">
                {f.resource || "—"}
              </div>

              {/* Message */}
              <div className="text-[12px] text-[color:var(--dg-fg-muted)] truncate min-w-0">
                {f.message}
              </div>

              {/* Type */}
              <div className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] uppercase tracking-wider">
                {f.type}
              </div>
            </button>

            {/* Expanded suggestion */}
            {expanded === i && (
              <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-4 py-4">
                {f.suggestion ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="dg-label flex items-center gap-2">
                        <span className="text-allowed">✓</span>
                        {t("dashboard.suggestedFix")}
                      </span>
                      <button
                        onClick={() => copy(i, f.suggestion!)}
                        className="font-sans font-medium text-[10px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
                      >
                        {copied === i ? `✓ ${t("common.copied")}` : `▸ ${t("common.copy")}`}
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] leading-relaxed text-[color:var(--dg-fg)]">
                      {f.suggestion}
                    </pre>
                  </>
                ) : (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{t("dashboard.noFixSuggestion")}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 flex items-center justify-between font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
        <span>{findings.length} {findings.length !== 1 ? t("dashboard.findingPlural") : t("dashboard.findingSingular")}</span>
        <span className="flex items-center gap-3">
          {["critical","high","medium","low"].map(s => {
            const n = findings.filter(f => f.severity === s).length;
            if (!n) return null;
            return (
              <span key={s} className={SEV_STYLE[s]?.split(" ")[0]}>
                {n} {s}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}
