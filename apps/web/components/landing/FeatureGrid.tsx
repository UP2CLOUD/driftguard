"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const FEATURES = [
  {
    tag: "cost",
    title: "Cost delta on every PR",
    body: "Infracost-powered monthly cost diff per resource. Threshold-based blocks (€500/mo? €5k/mo?). No surprises in the AWS bill at the end of the month.",
    glyph: "$",
    accent: "var(--dg-warned)",
  },
  {
    tag: "drift",
    title: "Live state vs. plan diff",
    body: "Compares the PR's terraform plan against the real cloud state. Catches manual changes, orphan resources, and out-of-band edits before merge.",
    glyph: "△",
    accent: "var(--dg-orange)",
  },
  {
    tag: "security",
    title: "Curated security findings",
    body: "Checkov + AI triage. 255 rules mapped to compliance controls. Public S3 buckets, wildcard IAM, missing encryption — all flagged with fix suggestions.",
    glyph: "⬡",
    accent: "var(--dg-blocked)",
  },
  {
    tag: "memory",
    title: "Semantic memory of failures",
    body: "Every blocked deploy and compliance violation embedded and indexed. Open a similar PR — the original incident appears in the comment.",
    glyph: "◉",
    accent: "var(--dg-purple)",
  },
  {
    tag: "compliance",
    title: "DORA / NIS2 / ISO 27001",
    body: "Each finding mapped to compliance controls. Audit evidence collected on every PR — no extra workflow, no questionnaires.",
    glyph: "✦",
    accent: "var(--dg-allowed)",
  },
  {
    tag: "ai-native",
    title: "Built for agent contributors",
    body: "AI agents (Cursor, Devin, Claude Code) write half your IaC. DriftGuard treats them like junior engineers: reviewed, mentored, fast-tracked when safe.",
    glyph: "◈",
    accent: "var(--dg-electric)",
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Full-stack governance"
          title="Six layers. One review. Zero config overhead."
          subtitle="Cost intelligence, live drift detection, security scanning, compliance evidence, semantic memory, and AI-native analysis — all triggered by a PR, all without changing your Terraform workflow."
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
