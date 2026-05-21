"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const EVENTS = [
  {
    ts: "09:14:02.341",
    type: "intercept",
    agent: "cursor-agent",
    repo: "acme/infra",
    pr: 847,
    message: "PR opened — 23 resource changes detected",
    detail: "terraform plan: +12 ~8 -3",
    status: "running",
    dot: "bg-[color:var(--dg-electric)]",
    label: "text-[color:var(--dg-electric-bright)]",
    badge: "SCAN",
  },
  {
    ts: "09:14:04.891",
    type: "cost",
    agent: "cursor-agent",
    repo: "acme/infra",
    pr: 847,
    message: "Cost delta: +€892/mo on aws_rds_cluster.prod",
    detail: "db.r5.large → db.r5.4xlarge · threshold exceeded",
    status: "warned",
    dot: "bg-warned",
    label: "text-warned",
    badge: "COST",
  },
  {
    ts: "09:14:05.120",
    type: "memory",
    agent: "cursor-agent",
    repo: "acme/infra",
    pr: 847,
    message: "Memory recall: 3 similar incidents (sim ≥ 0.87)",
    detail: "rds.resize.prod · 2026-04-22 · outcome: blocked",
    status: "recalled",
    dot: "bg-[color:var(--dg-purple)]",
    label: "text-[color:var(--dg-purple)]",
    badge: "RECALL",
  },
  {
    ts: "09:14:05.440",
    type: "security",
    agent: "cursor-agent",
    repo: "acme/infra",
    pr: 847,
    message: "CRITICAL: aws_s3_bucket.tf-state — public access removed",
    detail: "CKV_AWS_19 · NIS2 Art.21 · risk +40pts",
    status: "blocked",
    dot: "bg-blocked shadow-[0_0_6px_rgba(255,71,87,0.5)]",
    label: "text-blocked",
    badge: "BLOCK",
  },
  {
    ts: "09:14:05.891",
    type: "check",
    agent: "driftguard",
    repo: "acme/infra",
    pr: 847,
    message: "Check run posted — status: failure · risk 84/100",
    detail: "Merge blocked. Fix 2 critical findings to proceed.",
    status: "blocked",
    dot: "bg-blocked",
    label: "text-blocked",
    badge: "GATE",
  },
  {
    ts: "09:14:06.012",
    type: "comment",
    agent: "driftguard",
    repo: "acme/infra",
    pr: 847,
    message: "PR comment posted — AI review + memory citations",
    detail: "8 findings · 3 recalled incidents · suggested fixes inline",
    status: "ok",
    dot: "bg-allowed",
    label: "text-allowed",
    badge: "DONE",
  },
] as const;

const BADGE_STYLE: Record<string, string> = {
  SCAN:   "border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10 text-[color:var(--dg-electric-bright)]",
  COST:   "border-warned/30 bg-warned/10 text-warned",
  RECALL: "border-[color:var(--dg-purple)]/30 bg-[color:var(--dg-purple)]/10 text-[color:var(--dg-purple)]",
  BLOCK:  "border-blocked/30 bg-blocked/10 text-blocked",
  GATE:   "border-blocked/30 bg-blocked/10 text-blocked",
  DONE:   "border-allowed/30 bg-allowed/10 text-allowed",
};

export function IncidentTimeline() {
  const [visible, setVisible] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealCount(i);
      if (i >= EVENTS.length) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <section ref={ref} className="py-20 sm:py-28 border-t border-[color:var(--dg-border)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Runtime governance"
          title="Every agent PR. Every millisecond."
          subtitle="DriftGuard intercepts, analyses, and gates in under 2 seconds. Before the merge button is even available."
        />

        <div className="mt-12 grid lg:grid-cols-[1fr_420px] gap-8 items-start">
          {/* Timeline feed */}
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] overflow-hidden">
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blocked/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warned/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-allowed/60" />
              </div>
              <div className="flex-1 text-center font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                driftguard — runtime trace · PR #847 · acme/infra
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
                <span className="font-mono text-[10px] text-allowed">live</span>
              </div>
            </div>

            {/* Events */}
            <div className="divide-y divide-[color:var(--dg-border)]">
              {EVENTS.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 px-4 py-3.5 transition-all duration-300 ${
                    i < revealCount
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  } ${e.status === "blocked" ? "bg-blocked/3" : ""}`}
                >
                  {/* Dot + line */}
                  <div className="flex flex-col items-center gap-0 pt-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${e.dot}`} />
                    {i < EVENTS.length - 1 && (
                      <div className="w-px flex-1 mt-1 bg-[color:var(--dg-border)] min-h-[20px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] tabular-nums shrink-0">
                        {e.ts}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${BADGE_STYLE[e.badge]}`}>
                        {e.badge}
                      </span>
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                        {e.agent}
                      </span>
                    </div>
                    <div className={`text-[12px] font-medium ${e.label}`}>
                      {e.message}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                      {e.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-2.5 flex justify-between font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
              <span>6 events · 1.571s total</span>
              <span className="text-blocked">merge blocked · 2 critical findings</span>
            </div>
          </div>

          {/* Explanation sidebar */}
          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Webhook intercept",
                body: "GitHub sends PR events to DriftGuard the instant an agent pushes. No polling.",
                color: "var(--dg-electric)",
              },
              {
                step: "02",
                title: "Parallel analysis",
                body: "Cost (Infracost), security (Checkov), drift (STS), and compliance run concurrently — not sequentially.",
                color: "var(--dg-warned)",
              },
              {
                step: "03",
                title: "Memory recall",
                body: "pgvector cosine search matches the diff against every prior incident. If this pattern broke prod before, it shows up.",
                color: "var(--dg-purple)",
              },
              {
                step: "04",
                title: "Hard gate",
                body: "A GitHub Check Run blocks the merge button. The agent cannot self-approve. Human review required above risk threshold 70.",
                color: "var(--dg-blocked)",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold"
                    style={{ color: s.color }}
                  >
                    {s.step}
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-[color:var(--dg-fg)] mb-1">
                      {s.title}
                    </div>
                    <p className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)]">
                      {s.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
