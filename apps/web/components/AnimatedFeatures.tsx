"use client";

import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    icon: "◈",
    title: "Cost delta",
    body: "Every PR comment shows monthly cost impact, by resource. Powered by terraform plan + cost engine. No surprises.",
    accent: "from-orange-500/20 to-transparent",
    tag: "FinOps",
  },
  {
    icon: "⟳",
    title: "Drift detection",
    body: "Compares HEAD against real cloud state. Flags drift caused by humans or other agents before merge.",
    accent: "from-sky-500/20 to-transparent",
    tag: "Reliability",
  },
  {
    icon: "⬡",
    title: "Security findings",
    body: "Curated rules + AI triage. Only the findings that matter, ranked by blast radius.",
    accent: "from-red-500/20 to-transparent",
    tag: "Security",
  },
  {
    icon: "✦",
    title: "AI summary",
    body: "Claude Sonnet synthesizes findings into a high-signal PR review. No hallucination — every claim cites a resource.",
    accent: "from-violet-500/20 to-transparent",
    tag: "AI",
  },
  {
    icon: "⊞",
    title: "EU compliance",
    body: "DORA, NIS2, ISO 27001 control mapping per resource. Audit-ready evidence collected on every PR — without questionnaires.",
    accent: "from-emerald-500/20 to-transparent",
    tag: "Compliance",
  },
  {
    icon: "⌥",
    title: "Policy-as-code",
    body: "Bring your OPA or YAML policies. Driftguard enforces them per repo, with audit trail.",
    accent: "from-amber-500/20 to-transparent",
    tag: "Governance",
  },
  {
    icon: "⊕",
    title: "OpenTofu & Terraform",
    body: "Terraform and OpenTofu supported. Multi-cloud (AWS, GCP, Azure). No HashiCorp Cloud lock-in.",
    accent: "from-teal-500/20 to-transparent",
    tag: "IaC",
  },
];

function FeatureCard({
  icon, title, body, accent, tag, index,
}: {
  icon: string; title: string; body: string; accent: string; tag: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 80}ms` }}
      className={`group relative overflow-hidden rounded-lg border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/40 p-6 backdrop-blur-sm
        transition-all duration-700 ease-out cursor-default
        hover:border-[color:var(--dg-border-strong)] hover:bg-[color:var(--dg-surface)]/80 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      {/* top gradient bar */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />

      {/* hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
        bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl text-[color:var(--dg-fg-subtle)] group-hover:text-orange-400 transition-colors duration-300 leading-none select-none">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] border border-[color:var(--dg-border)] px-1.5 py-0.5 rounded group-hover:border-[color:var(--dg-border-strong)] group-hover:text-[color:var(--dg-fg-subtle)] transition-colors duration-300">
          {tag}
        </span>
      </div>

      <h3 className="mb-2 text-sm font-bold tracking-tight text-[color:var(--dg-fg)] group-hover:text-orange-400 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-[color:var(--dg-fg-subtle)] group-hover:text-[color:var(--dg-fg-muted)] transition-colors duration-300">
        {body}
      </p>

      {/* corner accent */}
      <div className="absolute bottom-0 right-0 h-12 w-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute bottom-0 right-0 h-full w-full bg-gradient-to-tl ${accent} rounded-tl-3xl`} />
      </div>
    </div>
  );
}

export function AnimatedFeatures() {
  return (
    <div className="relative mx-auto grid max-w-7xl gap-4 px-4 py-16 md:grid-cols-3 lg:gap-6">
      {/* background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {FEATURES.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </div>
  );
}
