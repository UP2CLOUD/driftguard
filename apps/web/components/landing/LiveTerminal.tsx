"use client";

import { useEffect, useRef, useState } from "react";

type EventLine = {
  ts: string;
  kind: "INTERCEPT" | "RECALL" | "BLOCK" | "ALLOW" | "DRIFT";
  actor: string;
  msg: string;
  resource?: string;
};

const SCRIPT: EventLine[] = [
  { ts: "+0.001s", kind: "INTERCEPT", actor: "agent.terraform-writer", msg: "intent: terraform apply", resource: "prod/networking.tf" },
  { ts: "+0.004s", kind: "RECALL", actor: "memory.semantic", msg: "found 2 similar past failures (cos 0.91, 0.87)" },
  { ts: "+0.011s", kind: "BLOCK", actor: "guardrail.policy", msg: "would delete aws_rds_cluster.prod (drift from approved plan)", resource: "aws_rds_cluster.prod" },
  { ts: "+0.012s", kind: "INTERCEPT", actor: "agent.code-fixer", msg: "intent: write k8s manifest", resource: "infra/staging/ingress.yaml" },
  { ts: "+0.018s", kind: "RECALL", actor: "memory.semantic", msg: "context: previous TLS misconfig 2026-04-22" },
  { ts: "+0.024s", kind: "ALLOW", actor: "guardrail.policy", msg: "passes policy check, audit logged", resource: "ingress-staging" },
  { ts: "+0.031s", kind: "DRIFT", actor: "monitor.runtime", msg: "live state diverged from declared (3 resources)", resource: "aws_s3_bucket.uploads" },
  { ts: "+0.037s", kind: "INTERCEPT", actor: "agent.sre-bot", msg: "intent: scale eks node group", resource: "prod-eks-1" },
  { ts: "+0.044s", kind: "RECALL", actor: "memory.semantic", msg: "similar incident: 2026-03-14 OOM during scale-up" },
  { ts: "+0.051s", kind: "ALLOW", actor: "guardrail.policy", msg: "warn: pre-scale memory check recommended", resource: "prod-eks-1" },
];

const KIND_STYLES: Record<EventLine["kind"], string> = {
  INTERCEPT: "text-[color:var(--dg-electric-bright)] border-l-[color:var(--dg-electric)]",
  RECALL: "text-[#a78bfa] border-l-[#7c3aed]",
  BLOCK: "text-blocked border-l-blocked",
  ALLOW: "text-allowed border-l-allowed",
  DRIFT: "text-warned border-l-warned",
};

const KIND_GLYPH: Record<EventLine["kind"], string> = {
  INTERCEPT: "↯",
  RECALL: "◉",
  BLOCK: "■",
  ALLOW: "✓",
  DRIFT: "△",
};

export function LiveTerminal() {
  const [feed, setFeed] = useState<EventLine[]>([SCRIPT[0]]);
  const [counters, setCounters] = useState({ intercepted: 0, blocked: 0, recalled: 0 });
  const idxRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(() => {
      const next = SCRIPT[idxRef.current % SCRIPT.length];
      idxRef.current += 1;
      setFeed((f) => {
        const updated = [...f, next];
        return updated.length > 12 ? updated.slice(-12) : updated;
      });
      setCounters((c) => ({
        intercepted: c.intercepted + 1,
        blocked: c.blocked + (next.kind === "BLOCK" ? 1 : 0),
        recalled: c.recalled + (next.kind === "RECALL" ? 1 : 0),
      }));
    }, 1400);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  return (
    <div className="relative">
      {/* Outer frame with corner marks */}
      <div className="absolute -top-2 -left-2 h-3 w-3 border-l border-t border-[color:var(--dg-border-bright)]" />
      <div className="absolute -top-2 -right-2 h-3 w-3 border-r border-t border-[color:var(--dg-border-bright)]" />
      <div className="absolute -bottom-2 -left-2 h-3 w-3 border-l border-b border-[color:var(--dg-border-bright)]" />
      <div className="absolute -bottom-2 -right-2 h-3 w-3 border-r border-b border-[color:var(--dg-border-bright)]" />

      <div className="relative overflow-hidden rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/95 dg-scanline">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blocked/70" />
            <span className="h-2 w-2 rounded-full bg-warned/70" />
            <span className="h-2 w-2 rounded-full bg-allowed/70" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)]">
              driftguard ▸ runtime-supervisor ▸ live
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-allowed">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Counter strip */}
        <div className="grid grid-cols-3 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/40">
          <Counter label="intercepted" value={counters.intercepted} />
          <Counter label="recalled" value={counters.recalled} bordered />
          <Counter label="blocked" value={counters.blocked} accent="blocked" />
        </div>

        {/* Feed */}
        <div ref={scrollRef} className="h-[300px] sm:h-[340px] overflow-hidden p-2.5 sm:p-3 font-mono text-[10px] sm:text-[11.5px] leading-relaxed">
          {feed.map((e, i) => (
            <div
              key={`${e.ts}-${i}`}
              className={`mb-1.5 flex items-start gap-1.5 sm:gap-2 border-l-2 pl-1.5 sm:pl-2 dg-reveal ${KIND_STYLES[e.kind]}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="text-[color:var(--dg-fg-subtle)] tabular-nums shrink-0 hidden sm:inline">{e.ts}</span>
              <span className="shrink-0 w-3 text-center">{KIND_GLYPH[e.kind]}</span>
              <span className="shrink-0 font-bold tracking-wide text-[9px] sm:text-[11px]">{e.kind}</span>
              <span className="text-[color:var(--dg-fg-muted)] shrink-0 hidden md:inline">{e.actor}</span>
              <span className="text-[color:var(--dg-fg)] flex-1 truncate">{e.msg}</span>
              {e.resource && (
                <span className="text-[color:var(--dg-fg-subtle)] truncate max-w-[80px] sm:max-w-[140px] hidden sm:inline">{e.resource}</span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 text-[color:var(--dg-fg-subtle)]">
            <span>{">"}</span>
            <span className="dg-cursor inline-block h-3 w-1.5 bg-[color:var(--dg-fg-muted)]" />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-3 py-1.5 font-mono text-[9px] sm:text-[10px] tracking-wider text-[color:var(--dg-fg-subtle)] gap-2">
          <span className="truncate">policy.engine: opa ▪ memory: 384‑d ▪ <span className="hidden sm:inline">p99 1.2s</span></span>
          <span className="text-allowed shrink-0">● healthy</span>
        </div>
      </div>
    </div>
  );
}

function Counter({
  label, value, bordered, accent,
}: { label: string; value: number; bordered?: boolean; accent?: "blocked" | "allowed" }) {
  return (
    <div className={`px-4 py-3 ${bordered ? "border-x border-[color:var(--dg-border)]" : ""}`}>
      <div className="dg-label">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${
        accent === "blocked" ? "text-blocked" : "text-[color:var(--dg-fg)]"
      }`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
