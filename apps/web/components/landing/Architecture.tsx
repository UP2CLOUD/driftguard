"use client";

import { useEffect, useRef, useState } from "react";

export function Architecture() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="architecture" ref={ref} className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Architecture"
          title="Infrastructure, not middleware."
          subtitle="DriftGuard is a GitHub App — no sidecar, no agent, no cloud access beyond read-only STS. The review pipeline runs on our infrastructure. Your Terraform never moves."
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* Diagram */}
          <div className="relative">
            <div className="relative rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 sm:p-6 md:p-8 overflow-hidden">
              <div className="dg-label mb-6">fig 02 ▸ data flow</div>

              <div className="overflow-x-auto">
                <svg viewBox="0 0 600 380" className="h-auto min-w-[480px] max-w-full">
                {/* Grid bg */}
                <defs>
                  <pattern id="arch-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(154,160,166,0.05)" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="electric-flow" x1="0" x2="1">
                    <stop offset="0" stopColor="var(--dg-electric)" stopOpacity="0" />
                    <stop offset="0.5" stopColor="var(--dg-electric)" stopOpacity="1" />
                    <stop offset="1" stopColor="var(--dg-electric)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect width="600" height="380" fill="url(#arch-grid)" />

                {/* Agent box */}
                <ArchNode x={20} y={140} w={120} label="AGENT" sub="LLM / code-gen" color="var(--dg-fg-muted)" visible={visible} delay={0} />

                {/* Intent arrow */}
                <Arrow from={[140, 165]} to={[230, 165]} animated={visible} delay={400} label="intent" />

                {/* DriftGuard core */}
                <g className={visible ? "dg-reveal" : "opacity-0"} style={{ animationDelay: "800ms" }}>
                  <rect x="230" y="80" width="200" height="220" rx="6"
                    fill="var(--dg-surface-raised)"
                    stroke="var(--dg-electric)"
                    strokeWidth="1.5" />
                  <text x="330" y="98" fontFamily="monospace" fontSize="9" fill="var(--dg-electric-bright)"
                    textAnchor="middle" letterSpacing="2">DRIFTGUARD CORE</text>

                  {/* Inner blocks */}
                  <rect x="246" y="112" width="168" height="50" rx="3"
                    fill="var(--dg-canvas)" stroke="var(--dg-border-strong)" />
                  <text x="330" y="135" fontFamily="monospace" fontSize="11" fill="var(--dg-fg)" textAnchor="middle">memory.recall</text>
                  <text x="330" y="148" fontFamily="monospace" fontSize="9" fill="var(--dg-fg-subtle)" textAnchor="middle">384‑d semantic search</text>

                  <rect x="246" y="170" width="168" height="50" rx="3"
                    fill="var(--dg-canvas)" stroke="var(--dg-border-strong)" />
                  <text x="330" y="193" fontFamily="monospace" fontSize="11" fill="var(--dg-fg)" textAnchor="middle">policy.engine</text>
                  <text x="330" y="206" fontFamily="monospace" fontSize="9" fill="var(--dg-fg-subtle)" textAnchor="middle">OPA / Rego</text>

                  <rect x="246" y="228" width="168" height="50" rx="3"
                    fill="var(--dg-canvas)" stroke="var(--dg-border-strong)" />
                  <text x="330" y="251" fontFamily="monospace" fontSize="11" fill="var(--dg-fg)" textAnchor="middle">audit.log</text>
                  <text x="330" y="264" fontFamily="monospace" fontSize="9" fill="var(--dg-fg-subtle)" textAnchor="middle">append-only, signed</text>
                </g>

                {/* Output arrows */}
                <Arrow from={[430, 165]} to={[520, 100]} animated={visible} delay={1200} label="allow" color="var(--dg-allowed)" />
                <Arrow from={[430, 215]} to={[520, 280]} animated={visible} delay={1400} label="block" color="var(--dg-blocked)" />

                {/* Output boxes */}
                <ArchNode x={520} y={75} w={70} h={50} label="EXEC" sub="" color="var(--dg-allowed)" visible={visible} delay={1600} small />
                <ArchNode x={520} y={255} w={70} h={50} label="HALT" sub="" color="var(--dg-blocked)" visible={visible} delay={1800} small />

                {/* Memory feedback loop */}
                <path d="M 330 300 Q 330 350, 80 350 Q 20 350, 20 230"
                  fill="none" stroke="var(--dg-electric-dim)" strokeWidth="1" strokeDasharray="3 3"
                  className={visible ? "" : "opacity-0"} />
                <text x="200" y="345" fontFamily="monospace" fontSize="9" fill="var(--dg-fg-subtle)"
                  className={visible ? "dg-reveal" : "opacity-0"} style={{ animationDelay: "2000ms" }}>
                  outcomes feed back into memory →
                </text>
              </svg>
              </div>
            </div>
          </div>

          {/* Right side: explanation steps */}
          <div className="flex flex-col justify-center">
            <Step
              n="01"
              title="PR opens"
              body="Any Terraform or OpenTofu PR — written by an engineer or AI agent — triggers DriftGuard. We read terraform plan, infracost output, and security scans."
              delay={0} visible={visible}
            />
            <Step
              n="02"
              title="Semantic recall (sub‑10ms)"
              body="The change embedding is matched against past failures across your team. If a similar incident exists, the PR comment cites it — with similarity score and link to the original incident."
              delay={150} visible={visible}
            />
            <Step
              n="03"
              title="Policy gate"
              body="OPA‑compatible policies enforce allowed actions per environment, resource class, and risk score. Block merges, warn reviewers, or auto‑approve safe changes."
              delay={300} visible={visible}
            />
            <Step
              n="04"
              title="Comment on PR"
              body="Single high‑signal PR comment: cost delta, drift, security findings, compliance evidence (DORA / NIS2 / ISO 27001) — and citations to past failures."
              delay={450} visible={visible}
            />
            <Step
              n="05"
              title="Outcome flows back"
              body="Merge result and post‑deploy state become new memory. Your agents and engineers get sharper every day."
              delay={600} visible={visible}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchNode({ x, y, w, h = 50, label, sub, color, visible, delay, small }: any) {
  return (
    <g className={visible ? "dg-reveal" : "opacity-0"} style={{ animationDelay: `${delay}ms` }}>
      <rect x={x} y={y} width={w} height={h} rx="4"
        fill="var(--dg-surface-raised)" stroke={color} strokeWidth="1" />
      <text x={x + w / 2} y={y + (small ? 22 : 22)} fontFamily="monospace" fontSize={small ? "10" : "10"}
        fill={color} textAnchor="middle" letterSpacing="1.5">{label}</text>
      {sub && (
        <text x={x + w / 2} y={y + 36} fontFamily="monospace" fontSize="9"
          fill="var(--dg-fg-subtle)" textAnchor="middle">{sub}</text>
      )}
    </g>
  );
}

function Arrow({ from, to, animated, delay, label, color = "var(--dg-electric)" }: any) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const mid: [number, number] = [from[0] + dx / 2, from[1] + dy / 2];
  return (
    <g className={animated ? "dg-reveal" : "opacity-0"} style={{ animationDelay: `${delay}ms` }}>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth="1.25" />
      <polygon points={`${to[0]},${to[1]} ${to[0] - 6},${to[1] - 3} ${to[0] - 6},${to[1] + 3}`} fill={color} />
      {label && (
        <text x={mid[0]} y={mid[1] - 5} fontFamily="monospace" fontSize="9"
          fill="var(--dg-fg-muted)" textAnchor="middle">{label}</text>
      )}
    </g>
  );
}

function Step({ n, title, body, visible, delay }: any) {
  return (
    <div
      className={`group relative flex gap-5 border-l border-[color:var(--dg-border)] pl-5 pb-7 last:pb-0
        ${visible ? "dg-reveal" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border border-[color:var(--dg-electric)] bg-[color:var(--dg-canvas)]" />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] tracking-widest text-[color:var(--dg-fg-subtle)]">{n}</span>
          <span className="text-[15px] font-semibold text-[color:var(--dg-fg)]">{title}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">{body}</p>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-3xl">
      <div className="dg-label flex items-center gap-3">
        <span className="h-px w-6 bg-[color:var(--dg-electric)]" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-sans text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[color:var(--dg-fg)] sm:text-[32px] md:text-[40px]">
        {title}
      </h2>
      <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)]">{subtitle}</p>
    </div>
  );
}

export { SectionHeader };
