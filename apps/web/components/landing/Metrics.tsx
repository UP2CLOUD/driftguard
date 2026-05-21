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

  const intercepted = useCount(255, 1600, start);
  const blocked = useCount(9, 1600, start);
  const recalled = useCount(94, 1600, start);
  const latency = useCount(2, 1600, start);

  return (
    <section ref={ref} className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] py-14 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border-strong)] grid-cols-2 md:grid-cols-4">
          <MetricCell label="Checkov rules" value={intercepted.toLocaleString()} sub="security checks / PR" />
          <MetricCell label="Compliance controls" value={blocked.toLocaleString()} sub="DORA/NIS2/ISO27001/CIS" accent />
          <MetricCell label="Memory accuracy" value={`${recalled}%`} sub="precision@k similarity" />
          <MetricCell label="P99 latency" value={`<${latency}s`} sub="plan → comment posted" />
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
