"use client";

import { useT } from "@/components/TranslationProvider";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

function useCount(target: number, duration: number, start: boolean, reduced: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    // Reduced motion: show the final value immediately, no RAF loop.
    if (reduced) {
      setN(target);
      return;
    }
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
  }, [target, duration, start, reduced]);
  return n;
}

interface LiveMetrics {
  analyses_7d: number;
  open_incidents: number;
  memory_entries: number;
  avg_risk_7d: number | null;
}

const STATIC_FALLBACK = {
  checkov_rules: 255,
  compliance_controls: 9,
  memory_accuracy: 94,
  p99_latency: 2,
};

export function Metrics({ installationId }: { installationId?: number }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);
  const [live, setLive] = useState<LiveMetrics | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStart(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch real data if installationId is available
  useEffect(() => {
    if (!installationId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (!apiUrl) return;
    fetch(`${apiUrl}/api/v1/dashboard/overview?installation_id=${installationId}`, {
      signal: AbortSignal.timeout(3000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setLive(data as LiveMetrics);
      })
      .catch(() => {});
  }, [installationId]);

  // If live data available, show real numbers; else show static capabilities
  const m1 = useCount(live ? live.analyses_7d : STATIC_FALLBACK.checkov_rules, 1600, start, reduced);
  const m2 = useCount(live ? live.open_incidents : STATIC_FALLBACK.compliance_controls, 1600, start, reduced);
  const m3 = useCount(live ? live.memory_entries : STATIC_FALLBACK.memory_accuracy, 1600, start, reduced);
  const m4 = useCount(live ? (live.avg_risk_7d ?? 0) : STATIC_FALLBACK.p99_latency, 1600, start, reduced);

  const label1 = live ? t("landing.metrics.liveLabel1")   : t("landing.metrics.staticLabel1");
  const label2 = live ? t("landing.metrics.liveLabel2")   : t("landing.metrics.staticLabel2");
  const label3 = live ? t("landing.metrics.liveLabel3")   : t("landing.metrics.staticLabel3");
  const label4 = live ? t("landing.metrics.liveLabel4")   : t("landing.metrics.staticLabel4");
  const sub1   = live ? t("landing.metrics.liveSub1")     : t("landing.metrics.staticSub1");
  const sub2   = live ? t("landing.metrics.liveSub2")     : t("landing.metrics.staticSub2");
  const sub3   = live ? t("landing.metrics.liveSub3")     : t("landing.metrics.staticSub3");
  const sub4   = live ? t("landing.metrics.liveSub4")     : t("landing.metrics.staticSub4");
  const val4   = live ? `${m4}` : `<${m4}s`;

  return (
    <section ref={ref} className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <SectionHeader
          eyebrow={live ? t("landing.metrics.liveEyebrow") : t("landing.metrics.staticEyebrow")}
          title={live ? t("landing.metrics.liveTitle") : t("landing.metrics.staticTitle")}
          subtitle={
            live
              ? t("landing.metrics.liveSubtitle")
              : t("landing.metrics.staticSubtitle")
          }
        />
        <div className="mt-12 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border-strong)] grid-cols-2 md:grid-cols-4">
          <MetricCell label={label1} value={m1.toLocaleString()} sub={sub1} accent />
          <MetricCell label={label2} value={m2.toLocaleString()} sub={sub2} />
          <MetricCell label={label3} value={`${m3}${live ? "" : "%"}`} sub={sub3} />
          <MetricCell label={label4} value={val4} sub={sub4} />
        </div>
        {!live && (
          <p className="mt-4 text-center font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {t("landing.metrics.connectPrompt")}
          </p>
        )}
      </div>
    </section>
  );
}

function MetricCell({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="bg-[color:var(--dg-canvas)] px-5 py-6">
      <div className="dg-label">{label}</div>
      <div className={`mt-2 font-mono text-[28px] sm:text-[32px] font-bold tabular-nums leading-none ${
        accent ? "text-[color:var(--dg-electric-bright)]" : "text-[color:var(--dg-fg)]"
      }`}>
        {value}
      </div>
      <div className="mt-1.5 font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">{sub}</div>
    </div>
  );
}
