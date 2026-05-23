"use client";

import { useT } from "@/components/TranslationProvider";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const FEATURES = [
  {
    tag: "cost",
    title: "Cost delta on every PR",
    body: "Infracost-powered monthly cost diff per resource. Threshold-based blocks (€500/mo? €5k/mo?). No surprises in the AWS bill at the end of the month.",
    glyph: "$",
    accent: "var(--dg-warned)",
    example: "aws_rds_cluster.prod\ndb.r5.large → db.r5.4xlarge\n+€480/mo · threshold exceeded → BLOCKED",
  },
  {
    tag: "drift",
    title: "Live state vs. plan diff",
    body: "Compares the PR's terraform plan against the real cloud state. Catches manual changes, orphan resources, and out-of-band edits before merge.",
    glyph: "△",
    accent: "var(--dg-orange)",
    example: "aws_security_group.web-sg\nIngress 0.0.0.0/0 added via Console\n→ DRIFT DETECTED · 3h ago",
  },
  {
    tag: "security",
    title: "Curated security findings",
    body: "Checkov + AI triage. 255 rules mapped to compliance controls. Public S3 buckets, wildcard IAM, missing encryption — flagged with fix suggestions.",
    glyph: "⬡",
    accent: "var(--dg-blocked)",
    example: "aws_s3_bucket.tf-state\nPublic access block removed\nCKV_AWS_19 · NIS2 Art.21 → BLOCKED",
  },
  {
    tag: "memory",
    title: "Semantic memory of failures",
    body: "Every blocked deploy and compliance violation embedded and indexed. Open a similar PR — the original incident appears in the comment.",
    glyph: "◉",
    accent: "var(--dg-purple)",
    example: "rds.delete.prod recalled\ncos 0.94 · 2026-04-22\n→ Same misconfig blocked twice",
  },
  {
    tag: "compliance",
    title: "DORA / NIS2 / ISO 27001",
    body: "Each finding mapped to compliance controls. Audit evidence collected on every PR — no extra workflow, no questionnaires.",
    glyph: "✦",
    accent: "var(--dg-allowed)",
    example: "DORA Art.11 · NIS2 Art.21\nISO 27001 A.8.8 · CIS v8\n→ Evidence exported automatically",
  },
  {
    tag: "ai-native",
    title: "Built for agent contributors",
    body: "AI agents (Cursor, Devin, Claude Code) write half your IaC. DriftGuard treats them like junior engineers: reviewed, mentored, fast-tracked when safe.",
    glyph: "◈",
    accent: "var(--dg-electric)",
    example: "agent.cursor opened PR #847\n23 resources · risk 84/100\n→ 2 critical findings · BLOCKED",
  },
] as const;

function FeatureCell({
  tag, title, body, glyph, accent, example, index,
}: (typeof FEATURES)[number] & { index: number }) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative bg-[color:var(--dg-canvas)] p-6 overflow-hidden group dg-card-hover cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 500ms cubic-bezier(.16,1,.3,1) ${index * 60}ms, transform 500ms cubic-bezier(.16,1,.3,1) ${index * 60}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent corner */}
      <div
        className="absolute top-0 left-0 h-px w-full transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, transparent 60%)`,
          opacity: hovered ? 0.8 : 0.3,
        }}
      />

      {/* Glyph */}
      <div
        className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md border text-[16px] font-bold transition-all duration-200"
        style={{
          color: accent,
          borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
          background: `color-mix(in srgb, ${accent} 8%, transparent)`,
          boxShadow: hovered ? `0 0 16px color-mix(in srgb, ${accent} 25%, transparent)` : "none",
        }}
      >
        {glyph}
      </div>

      {/* Content */}
      <div
        className="transition-all duration-200"
        style={{ transform: hovered ? "translateY(-2px)" : "translateY(0)" }}
      >
        <h3 className="font-sans text-[14px] font-semibold text-[color:var(--dg-fg)] mb-2">
          {title}
        </h3>

        {/* Toggle between body and example on hover */}
        <div className="relative min-h-[60px]">
          <p
            className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)] transition-all duration-200"
            style={{ opacity: hovered ? 0 : 1 }}
          >
            {body}
          </p>
          <pre
            className="absolute inset-0 font-mono text-[10px] leading-relaxed transition-all duration-200 overflow-hidden"
            style={{
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateY(0)" : "translateY(4px)",
              color: accent,
            }}
          >
            {example}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function FeatureGrid() {
  const t = useT();
  return (
    <section id="product" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Full-stack governance"
          title={t("landing.featureGrid.sectionTitle")}
          subtitle="Cost intelligence, live drift detection, security scanning, compliance evidence, semantic memory, and AI-native analysis — all triggered by a PR, all without changing your Terraform workflow."
        />
        <div className="mt-16 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCell key={f.tag} {...f} index={i} />
          ))}
        </div>
        <p className="mt-4 text-center font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          Hover each card to see a real example
        </p>
      </div>
    </section>
  );
}
