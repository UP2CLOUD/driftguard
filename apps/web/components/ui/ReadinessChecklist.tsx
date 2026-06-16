"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  ctaLabel?: string;
}

interface ReadinessChecklistProps {
  items: ChecklistItem[];
  title?: string;
}

const DISMISS_KEY = "dg_checklist_dismissed";

export function ReadinessChecklist({ items, title = "Getting started" }: ReadinessChecklistProps) {
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (allDone || !mounted || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {title}
          </span>
          <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
            {doneCount}/{items.length}
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss checklist"
          className="h-5 w-5 flex items-center justify-center rounded text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-surface-raised)] transition cursor-pointer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="divide-y divide-[color:var(--dg-border)]">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                item.done ? "bg-allowed" : "bg-[color:var(--dg-border)]"
              }`}
            />
            <span
              className={`flex-1 text-[12px] ${
                item.done
                  ? "line-through text-[color:var(--dg-fg-subtle)]"
                  : "text-[color:var(--dg-fg-muted)]"
              }`}
            >
              {item.label}
            </span>
            {!item.done && item.href && item.ctaLabel && (
              <Link
                href={item.href}
                className="font-mono text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition shrink-0"
              >
                {item.ctaLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
