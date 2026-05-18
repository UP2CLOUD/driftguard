"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

function useCount(target: number, duration = 1400, start: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return n;
}

export function Metrics() {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStart(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const intercepted = useCount(14728310, 1800, start);
  const blocked = useCount(28412, 1800, start);
  const recalled = useCount(99.34, 1800, start);
  const latency = useCount(1.2, 1800, start);

  return (
    <section ref={ref} className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] py-20">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border-strong)] md:grid-cols-4">
          <MetricCell label="Intercepts / 30d" value={intercepted.toLocaleString()} sub="across pilot cohort" />
          <MetricCell label="Repeat failures prevented" value={blocked.toLocaleString()} sub="vs. baseline" accent />
          <MetricCell label="Recall accuracy" value={`${recalled.toFixed(2)}%`} sub="precision@5" />
          <MetricCell label="P99 latency" value={`${latency.toFixed(1)}s`} sub="end-to-end" />
        </div>
      </div>
    </section>
  );
}

function MetricCell({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="relative bg-[color:var(--dg-canvas)] p-7">
      {accent && (
        <span className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-allowed dg-pulse text-allowed" />
      )}
      <div className="dg-label">{label}</div>
      <div className="mt-3 font-mono text-3xl font-semibold tabular-nums text-[color:var(--dg-fg)]">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[color:var(--dg-fg-subtle)] font-mono">{sub}</div>
    </div>
  );
}
