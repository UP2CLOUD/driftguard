"use client";

import { useT } from "@/components/TranslationProvider";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const FEATURE_GLYPHS = {
  cost: { glyph: "$", accent: "var(--dg-warned)" },
  drift: { glyph: "△", accent: "var(--dg-orange)" },
  security: { glyph: "⬡", accent: "var(--dg-blocked)" },
  memory: { glyph: "◉", accent: "var(--dg-purple)" },
  compliance: { glyph: "✦", accent: "var(--dg-allowed)" },
  aiNative: { glyph: "◈", accent: "var(--dg-electric)" },
} as const;

type FeatureKey = keyof typeof FEATURE_GLYPHS;

function FeatureCell({
  title, body, glyph, accent, example, index,
}: { title: string; body: string; glyph: string; accent: string; example: string; index: number }) {
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
            className="absolute inset-0 font-sans font-medium text-[10px] leading-relaxed transition-all duration-200 overflow-hidden"
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

  const FEATURES: { key: FeatureKey; title: string; body: string; example: string }[] = [
    {
      key: "cost",
      title: t("landing.featureGrid.features.cost.title"),
      body: t("landing.featureGrid.features.cost.body"),
      example: t("landing.featureGrid.features.cost.example"),
    },
    {
      key: "drift",
      title: t("landing.featureGrid.features.drift.title"),
      body: t("landing.featureGrid.features.drift.body"),
      example: t("landing.featureGrid.features.drift.example"),
    },
    {
      key: "security",
      title: t("landing.featureGrid.features.security.title"),
      body: t("landing.featureGrid.features.security.body"),
      example: t("landing.featureGrid.features.security.example"),
    },
    {
      key: "memory",
      title: t("landing.featureGrid.features.memory.title"),
      body: t("landing.featureGrid.features.memory.body"),
      example: t("landing.featureGrid.features.memory.example"),
    },
    {
      key: "compliance",
      title: t("landing.featureGrid.features.compliance.title"),
      body: t("landing.featureGrid.features.compliance.body"),
      example: t("landing.featureGrid.features.compliance.example"),
    },
    {
      key: "aiNative",
      title: t("landing.featureGrid.features.aiNative.title"),
      body: t("landing.featureGrid.features.aiNative.body"),
      example: t("landing.featureGrid.features.aiNative.example"),
    },
  ];

  return (
    <section id="product" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow={t("landing.featureGrid.eyebrow")}
          title={t("landing.featureGrid.sectionTitle")}
          subtitle={t("landing.featureGrid.sectionSubtitle")}
        />
        <div className="mt-16 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCell
              key={f.key}
              title={f.title}
              body={f.body}
              example={f.example}
              glyph={FEATURE_GLYPHS[f.key].glyph}
              accent={FEATURE_GLYPHS[f.key].accent}
              index={i}
            />
          ))}
        </div>
        <p className="mt-4 text-center font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
          {t("landing.featureGrid.hoverHint")}
        </p>
      </div>
    </section>
  );
}
