"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "./Architecture";

const MEMORY_NODES = [
  { id: 1, label: "rds.delete.prod", incident: "2026-04-22", severity: "critical", sim: 0.94 },
  { id: 2, label: "iam.wildcard.s3", incident: "2026-04-15", severity: "high", sim: 0.87 },
  { id: 3, label: "tls.misconfig", incident: "2026-03-28", severity: "medium", sim: 0.71 },
  { id: 4, label: "k8s.ingress.public", incident: "2026-03-14", severity: "high", sim: 0.68 },
  { id: 5, label: "rds.no.encryption", incident: "2026-02-19", severity: "critical", sim: 0.65 },
  { id: 6, label: "ec2.security.group.0.0.0.0", incident: "2026-02-04", severity: "high", sim: 0.58 },
];

const QUERIES = [
  "new PR diff: terraform plan in prod/rds-changes.tf",
  "new PR diff: aws_iam_policy with wildcard resources",
  "new PR diff: kubernetes ingress with public binding",
];

export function SemanticMemory() {
  const [queryIdx, setQueryIdx] = useState(0);
  const [typed, setTyped] = useState(QUERIES[0][0] ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = QUERIES[queryIdx];
    let i = 0;
    setTyped("");
    const typer = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(typer);
        setTimeout(() => setQueryIdx((q) => (q + 1) % QUERIES.length), 3500);
      }
    }, 22);
    return () => clearInterval(typer);
  }, [queryIdx]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="memory" ref={ref} className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Operational memory"
          title="Your agents learn from production. Permanently."
          subtitle="Every incident — blocked deploy, drift event, policy violation — becomes a 384-d vector. When an AI agent submits a similar pattern weeks later, DriftGuard surfaces the original incident with a similarity score before the merge button is available."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Query panel */}
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
            <div className="border-b border-[color:var(--dg-border)] px-4 py-2.5">
              <div className="dg-label">Query</div>
            </div>
            <div className="p-5 font-mono text-[13px]">
              <div className="text-[color:var(--dg-fg-subtle)] mb-3">$ driftguard.recall(intent)</div>
              <div className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] p-3 min-h-[56px]">
                <span className="text-[color:var(--dg-electric-bright)]">→ </span>
                <span className="text-[color:var(--dg-fg)]">{typed}</span>
                <span className="dg-cursor inline-block h-3 w-1.5 bg-[color:var(--dg-fg-muted)] align-middle ml-0.5" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
                <KV k="embedding" v="384‑d ▪ 12ms" />
                <KV k="index" v="hnsw‑m32" />
                <KV k="recall" v="6 / 14k events" />
              </div>
            </div>
          </div>

          {/* Memory results */}
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
            <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-2.5">
              <div className="dg-label">Recalled incidents</div>
              <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                top‑k = 6
              </div>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {MEMORY_NODES.map((n, i) => (
                <div
                  key={n.id}
                  className={`group flex items-center gap-4 px-4 py-3 hover:bg-[color:var(--dg-surface-raised)] transition-colors duration-200
                    ${visible ? "dg-reveal" : "opacity-0"}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Severity dot */}
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    n.severity === "critical" ? "bg-blocked"
                    : n.severity === "high" ? "bg-[color:var(--dg-severity-high)]"
                    : "bg-warned"
                  }`} />

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">{n.label}</div>
                    <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] tabular-nums">{n.incident}</div>
                  </div>

                  {/* Similarity bar */}
                  <div className="hidden sm:flex items-center gap-2 w-32">
                    <div className="h-1 flex-1 rounded-full bg-[color:var(--dg-border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[color:var(--dg-electric)]"
                        style={{ width: visible ? `${n.sim * 100}%` : "0%", transition: `width ${600 + i * 100}ms ease-out` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-[color:var(--dg-electric-bright)] w-9 text-right">
                      {n.sim.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[color:var(--dg-border)] px-4 py-2.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] flex justify-between">
              <span>↑ ↓ navigate ▪ ↵ open trace</span>
              <span className="text-allowed">indexed ▪ healthy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-2 py-1.5">
      <div className="dg-label text-[9px]">{k}</div>
      <div className="font-mono text-[11px] text-[color:var(--dg-fg)] tabular-nums">{v}</div>
    </div>
  );
}
