"use client";

import { useEffect, useRef } from "react";

// Using realistic-sounding fictional company names
// Replace with real logos once design is approved
const COMPANIES = [
  "Platform engineers",
  "DevOps teams",
  "Infrastructure leads",
  "SRE teams",
  "AI agent operators",
  "Cloud architects",
  "Compliance engineers",
  "FinOps analysts",
  "Security engineers",
  "Staff engineers",
];

export function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: number | null = null;
    const speed = 28; // px/sec
    let width = el.scrollWidth / 2;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000;
      el.scrollLeft = (elapsed * speed) % width;
      requestAnimationFrame(step);
    };

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doubled = [...COMPANIES, ...COMPANIES];

  return (
    <div className="border-y border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-5">
      <p className="text-center font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-4">
        Trusted by platform &amp; infra teams at
      </p>
      <div
        ref={ref}
        className="overflow-hidden whitespace-nowrap"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="inline-flex gap-10">
          {doubled.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 font-mono text-[12px] text-[color:var(--dg-fg-subtle)] opacity-60 hover:opacity-100 transition-opacity duration-300"
            >
              <span className="h-1 w-1 rounded-full bg-[color:var(--dg-fg-subtle)]" />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
