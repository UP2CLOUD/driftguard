"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

/**
 * Copies `text` to the clipboard and briefly shows a "Copied!" state.
 * Styled with the shared dg mono/button aesthetic; safe to place inside a
 * server-rendered <pre> wrapper.
 */
export function CopyButton({ text, label = "Copy code to clipboard" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — fail silently */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied to clipboard" : label}
      className="absolute right-2 top-2 z-10 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] transition hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
