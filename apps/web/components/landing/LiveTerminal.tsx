"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Kind = "INTERCEPT" | "RECALL" | "BLOCK" | "ALLOW" | "DRIFT";
type Line = { ts: string; kind: Kind; actor: string; msg: string; id: number };

const SCRIPT: Omit<Line, "id">[] = [
  { ts: "+0.001s", kind: "INTERCEPT", actor: "agent.cursor",      msg: "PR #847: terraform apply — 23 resources" },
  { ts: "+0.004s", kind: "RECALL",    actor: "memory.semantic",   msg: "found 3 similar past failures (cos 0.94, 0.87, 0.81)" },
  { ts: "+0.011s", kind: "BLOCK",     actor: "guardrail.policy",  msg: "CRITICAL: aws_s3_bucket.tf-state public access removed" },
  { ts: "+0.018s", kind: "BLOCK",     actor: "guardrail.cost",    msg: "cost delta +€480/mo — threshold exceeded" },
  { ts: "+0.025s", kind: "INTERCEPT", actor: "agent.devin",       msg: "PR #843: k8s ingress update — 5 resources" },
  { ts: "+0.031s", kind: "RECALL",    actor: "memory.semantic",   msg: "context: TLS misconfig 2026-04-22 (cos 0.89)" },
  { ts: "+0.038s", kind: "ALLOW",     actor: "guardrail.policy",  msg: "passes all checks — audit logged" },
  { ts: "+0.044s", kind: "DRIFT",     actor: "monitor.runtime",   msg: "live state diverged: aws_ec2.bastion not in state" },
];

const STYLES: Record<Kind, { badge: string; line: string; dot: string }> = {
  INTERCEPT: { badge: "text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-electric)]/10",    line: "border-l-[color:var(--dg-electric)]/40",    dot: "bg-[color:var(--dg-electric)]" },
  RECALL:    { badge: "text-[color:var(--dg-purple)] bg-[color:var(--dg-purple)]/10",               line: "border-l-[color:var(--dg-purple)]/40",       dot: "bg-[color:var(--dg-purple)]" },
  BLOCK:     { badge: "text-blocked bg-blocked/10",                                                  line: "border-l-blocked/40 bg-blocked/[0.02]",      dot: "bg-blocked" },
  ALLOW:     { badge: "text-allowed bg-allowed/10",                                                  line: "border-l-allowed/40",                        dot: "bg-allowed" },
  DRIFT:     { badge: "text-warned bg-warned/10",                                                    line: "border-l-warned/40",                         dot: "bg-warned" },
};

const GLYPHS: Record<Kind, string> = {
  INTERCEPT: "↯", RECALL: "◉", BLOCK: "■", ALLOW: "✓", DRIFT: "△",
};

let UID = 0;

export function LiveTerminal() {
  const [lines, setLines] = useState<Line[]>([{ ...SCRIPT[0], id: ++UID }]);
  const [newLineId, setNewLineId] = useState<number | null>(null);
  const [counters, setCounters] = useState({ events: 0, blocked: 0, recalled: 0 });
  const idxRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLine = useCallback(() => {
    const raw = SCRIPT[idxRef.current % SCRIPT.length];
    idxRef.current += 1;
    const line = { ...raw, id: ++UID };
    setLines(prev => {
      const next = [...prev, line];
      return next.length > 10 ? next.slice(-10) : next;
    });
    setNewLineId(line.id);
    setCounters(c => ({
      events:   c.events + 1,
      blocked:  c.blocked  + (raw.kind === "BLOCK" ? 1 : 0),
      recalled: c.recalled + (raw.kind === "RECALL" ? 1 : 0),
    }));
    setTimeout(() => setNewLineId(null), 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(addLine, 1400);
    return () => clearInterval(interval);
  }, [addLine]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] overflow-hidden font-mono text-[11px]">
      {/* Chrome */}
      <div className="flex items-center gap-2 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-blocked/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-warned/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-allowed/50" />
        </div>
        <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          driftguard · runtime supervisor
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-allowed">
          <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
          LIVE · DEMO
        </span>
      </div>

      {/* Log feed */}
      <div
        ref={scrollRef}
        className="h-[220px] overflow-hidden relative"
      >
        {/* Scanline */}
        <div className="pointer-events-none absolute inset-0 dg-scan opacity-[0.03] z-10" />

        <div className="px-0 py-1">
          {lines.map((line, i) => {
            const s = STYLES[line.kind];
            const isNew = line.id === newLineId;
            return (
              <div
                key={line.id}
                className={`flex items-start gap-2 px-3 py-1 border-l-2 ${s.line}
                  ${i === lines.length - 1 ? "opacity-100" : "opacity-60"}
                  ${isNew ? "dg-slide-up" : ""}`}
                style={{
                  transition: isNew ? undefined : "opacity 400ms ease",
                }}
              >
                {/* Timestamp */}
                <span className="text-[color:var(--dg-fg-subtle)] tabular-nums shrink-0 pt-px">
                  {line.ts}
                </span>
                {/* Badge */}
                <span className={`rounded px-1 py-px text-[9px] uppercase tracking-widest shrink-0 ${s.badge}`}>
                  {GLYPHS[line.kind]} {line.kind}
                </span>
                {/* Message */}
                <span className="text-[color:var(--dg-fg-muted)] min-w-0 leading-relaxed">
                  <span className="text-[color:var(--dg-fg-subtle)]">{line.actor}</span>
                  {" "}{line.msg}
                  {i === lines.length - 1 && (
                    <span className="ml-0.5 inline-block h-[10px] w-[5px] bg-[color:var(--dg-fg-muted)] align-middle dg-cursor" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] grid grid-cols-3 divide-x divide-[color:var(--dg-border)]">
        {[
          { label: "events",   val: counters.events,   color: "text-[color:var(--dg-electric-bright)]" },
          { label: "blocked",  val: counters.blocked,  color: "text-blocked" },
          { label: "recalled", val: counters.recalled, color: "text-[color:var(--dg-purple)]" },
        ].map(({ label, val, color }) => (
          <div key={label} className="px-3 py-2 text-center">
            <div className={`font-mono text-base font-bold tabular-nums ${color}`}
              suppressHydrationWarning>
              {val}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
