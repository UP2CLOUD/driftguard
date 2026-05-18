"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const FEATURES = [
  {
    tag: "memory",
    title: "Persistent semantic memory",
    body: "Every incident, blocked action, and successful execution is embedded and indexed. Recall p99 ≤ 12ms across millions of events.",
    glyph: "◉",
    accent: "#a78bfa",
  },
  {
    tag: "guardrail",
    title: "Policy-as-code gate",
    body: "OPA / Rego policies enforce blast radius, environment, and resource constraints. Same policy locally, in CI, and at runtime.",
    glyph: "⬡",
    accent: "var(--dg-electric)",
  },
  {
    tag: "trace",
    title: "Execution trace replay",
    body: "Every intercept produces a deterministic trace. Replay any agent decision, inspect memory recalls, audit the entire chain.",
    glyph: "◈",
    accent: "var(--dg-cyan)",
  },
  {
    tag: "drift",
    title: "Live state diff",
    body: "Continuous reconciliation between declared state and live cloud. Drift gets flagged in the same interface as agent failures.",
    glyph: "△",
    accent: "var(--dg-warned)",
  },
  {
    tag: "compliance",
    title: "Audit-ready evidence",
    body: "DORA, NIS2, ISO 27001, SOC 2. Every action is signed, timestamped, and exportable. Compliance is a side effect, not a workflow.",
    glyph: "✦",
    accent: "var(--dg-allowed)",
  },
  {
    tag: "isolation",
    title: "Multi-tenant by design",
    body: "Per-project memory, encryption keys, and policy bundles. EU-hosted. Self-host available for regulated environments.",
    glyph: "⊞",
    accent: "#f97316",
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <SectionHeader
          eyebrow="Capabilities"
          title="A control plane for autonomous infra."
          subtitle="Six primitives that turn fragile agent loops into auditable production systems."
        />

        <div className="mt-16 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCell key={f.tag} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCell({
  tag, title, body, glyph, accent, index,
}: {
  tag: string; title: string; body: string; glyph: string; accent: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`group relative bg-[color:var(--dg-canvas)] p-7 transition-colors duration-300 cursor-default
        hover:bg-[color:var(--dg-surface)] ${visible ? "dg-reveal" : "opacity-0"}`}
    >
      {/* Hover-only accent bar (top) */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="flex items-start justify-between mb-5">
        <span className="font-mono text-2xl leading-none" style={{ color: accent }}>{glyph}</span>
        <span className="dg-label">{tag}</span>
      </div>

      <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-[color:var(--dg-fg)] transition-colors duration-300 group-hover:text-[color:var(--dg-electric-bright)]">
        {title}
      </h3>
      <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">{body}</p>

      {/* Bottom border on hover */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
        style={{ background: accent }}
      />
    </div>
  );
}
