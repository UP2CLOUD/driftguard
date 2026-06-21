"use client";

import { useState, useCallback } from "react";

export function ShareButton({ label, copiedLabel }: { label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, []);

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? copiedLabel : label}
      className="inline-flex items-center gap-1.5 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-1.5 font-sans font-medium text-[11px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition cursor-pointer"
    >
      {copied ? (
        <svg className="h-3 w-3 text-allowed shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
