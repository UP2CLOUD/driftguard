"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

/**
 * A copy-to-clipboard row used in Settings. Renders a label, a monospace
 * value, and a small button that copies the value and shows a transient
 * confirmation. Falls back gracefully when the Clipboard API is unavailable.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3 gap-3">
      <span className="text-[12px] text-[color:var(--dg-fg-muted)] shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate" title={value}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-[color:var(--dg-border)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:border-[color:var(--dg-electric)]/40 hover:text-[color:var(--dg-electric)] transition"
          aria-label={`${t("common.copy")} ${label}`}
        >
          {copied ? `✓ ${t("common.copied")}` : t("common.copy")}
        </button>
      </div>
    </div>
  );
}
