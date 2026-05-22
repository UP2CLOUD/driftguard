"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SectionHeader } from "./Architecture";

const STATIC_EVENTS = [
  { ts: "09:14:02.341", badge: "SCAN",   label: "text-[color:var(--dg-electric-bright)]", dot: "bg-[color:var(--dg-electric)] shadow-[0_0_6px_rgba(63,140,255,0.5)]", message: "PR #847 opened by cursor-agent — 23 resource changes", detail: "terraform plan: +12 ~8 -3", source: "cursor-agent" },
  { ts: "09:14:04.891", badge: "COST",   label: "text-warned",  dot: "bg-warned shadow-[0_0_6px_rgba(255,176,32,0.5)]", message: "Cost delta: +€892/mo on aws_rds_cluster.prod", detail: "db.r5.large → db.r5.4xlarge · threshold exceeded", source: "infracost" },
  { ts: "09:14:05.120", badge: "RECALL", label: "text-[color:var(--dg-purple)]", dot: "bg-[color:var(--dg-purple)] shadow-[0_0_6px_rgba(167,139,250,0.5)]", message: "Memory recall: 3 similar incidents (sim ≥ 0.87)", detail: "rds.resize.prod · 2026-04-22 · outcome: blocked", source: "memory" },
  { ts: "09:14:05.440", badge: "BLOCK",  label: "text-blocked", dot: "bg-blocked shadow-[0_0_8px_rgba(255,71,87,0.7)]",   message: "CRITICAL: aws_s3_bucket.tf-state — public access removed", detail: "CKV_AWS_19 · NIS2 Art.21 · risk +40pts", source: "checkov" },
  { ts: "09:14:05.891", badge: "GATE",   label: "text-blocked", dot: "bg-blocked", message: "Check run posted — status: failure · risk 84/100", detail: "Merge blocked. Fix 2 critical findings to proceed.", source: "driftguard" },
  { ts: "09:14:06.012", badge: "DONE",   label: "text-allowed", dot: "bg-allowed", message: "PR comment posted — AI review + memory citations", detail: "8 findings · 3 recalled incidents · suggested fixes inline", source: "driftguard" },
] as const;

const BADGE_STYLE: Record<string, string> = {
  SCAN:   "border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10 text-[color:var(--dg-electric-bright)]",
  COST:   "border-warned/30 bg-warned/10 text-warned",
  RECALL: "border-[color:var(--dg-purple)]/30 bg-[color:var(--dg-purple)]/10 text-[color:var(--dg-purple)]",
  BLOCK:  "border-blocked/30 bg-blocked/10 text-blocked",
  GATE:   "border-blocked/30 bg-blocked/10 text-blocked",
  DONE:   "border-allowed/30 bg-allowed/10 text-allowed",
};

// Map severity → badge
const SEV_BADGE: Record<string, string> = {
  critical: "BLOCK", high: "GATE", warn: "COST", info: "SCAN",
};
const SEV_DOT: Record<string, string> = {
  critical: "bg-blocked shadow-[0_0_6px_rgba(255,71,87,0.6)]",
  high:     "bg-[color:var(--dg-severity-high)] shadow-[0_0_6px_rgba(255,136,0,0.5)]",
  warn:     "bg-warned shadow-[0_0_6px_rgba(255,176,32,0.4)]",
  info:     "bg-[color:var(--dg-electric)] shadow-[0_0_4px_rgba(63,140,255,0.4)]",
};
const SEV_LABEL: Record<string, string> = {
  critical: "text-blocked",
  high:     "text-[color:var(--dg-severity-high)]",
  warn:     "text-warned",
  info:     "text-[color:var(--dg-electric-bright)]",
};

interface LiveEvent {
  id: string;
  event_type: string;
  severity: string;
  source: string;
  message: string;
  created_at: string;
}

function toDisplayEvent(e: LiveEvent) {
  const badge = SEV_BADGE[e.severity] ?? "SCAN";
  const ts = new Date(e.created_at).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return {
    ts,
    badge,
    label: SEV_LABEL[e.severity] ?? "text-[color:var(--dg-fg)]",
    dot: SEV_DOT[e.severity] ?? "bg-[color:var(--dg-fg-subtle)]",
    message: e.message.slice(0, 90),
    detail: `${e.event_type} · ${e.source}`,
    source: e.source,
  };
}

export function IncidentTimeline({ installationId }: { installationId?: number }) {
  const [visible, setVisible] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [liveEvents, setLiveEvents] = useState<ReturnType<typeof toDisplayEvent>[]>([]);
  const [isLive, setIsLive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intersection observer
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Staggered static reveal
  useEffect(() => {
    if (!visible || isLive) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealCount(i);
      if (i >= STATIC_EVENTS.length) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, [visible, isLive]);

  // Polling when installationId available
  const fetchEvents = useCallback(async () => {
    if (!installationId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (!apiUrl) return;
    try {
      const res = await fetch(
        `${apiUrl}/api/v1/events?installation_id=${installationId}&limit=6`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (!res.ok) return;
      const data: LiveEvent[] = await res.json();
      if (data.length > 0) {
        setLiveEvents(data.map(toDisplayEvent));
        setIsLive(true);
        setRevealCount(data.length);
      }
    } catch {
      // API unavailable — stay with static
    }
  }, [installationId]);

  useEffect(() => {
    fetchEvents();
    if (installationId) {
      pollRef.current = setInterval(fetchEvents, 15_000); // 15s polling
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchEvents, installationId]);

  const displayEvents = isLive ? liveEvents : STATIC_EVENTS;
  const totalTime = isLive ? "live" : "1.571s total";
  const footer = isLive
    ? `${liveEvents.length} live events · polling 15s`
    : "6 events · 1.571s total · merge blocked";
  const footerRight = isLive
    ? liveEvents.some((e) => e.badge === "BLOCK") ? "merge blocked" : "all clear"
    : "merge blocked · 2 critical findings";

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
            {/* Chrome */}
            <div className="flex items-center gap-2 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blocked/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warned/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-allowed/60" />
              </div>
              <div className="flex-1 text-center font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                driftguard — runtime trace
                {isLive ? ` · installation ${installationId}` : " · PR #847 · acme/infra"}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-allowed dg-pulse" : "bg-[color:var(--dg-fg-subtle)]"}`} />
                <span className={`font-mono text-[10px] ${isLive ? "text-allowed" : "text-[color:var(--dg-fg-subtle)]"}`}>
                  {isLive ? "live" : "demo"}
                </span>
              </div>
            </div>

            {/* Events */}
            <div className="divide-y divide-[color:var(--dg-border)]">
              {displayEvents.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 px-4 py-3.5 transition-all duration-300 ${
                    i < revealCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  } ${e.badge === "BLOCK" || e.badge === "GATE" ? "bg-blocked/[0.03]" : ""}`}
                >
                  <div className="flex flex-col items-center gap-0 pt-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${e.dot}`} />
                    {i < displayEvents.length - 1 && (
                      <div className="w-px flex-1 mt-1 bg-[color:var(--dg-border)] min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] tabular-nums shrink-0">
                        {e.ts}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest shrink-0 ${BADGE_STYLE[e.badge] ?? ""}`}>
                        {e.badge}
                      </span>
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                        {e.source}
                      </span>
                    </div>
                    <div className={`text-[12px] font-medium truncate ${e.label}`}>
                      {e.message}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                      {e.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-2.5 flex justify-between font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
              <span>{footer}</span>
              <span className={footerRight.includes("blocked") ? "text-blocked" : "text-[color:var(--dg-fg-subtle)]"}>
                {footerRight}
              </span>
            </div>
          </div>

          {/* Explanation sidebar */}
          <div className="space-y-4">
            {[
              { step: "01", title: "Webhook intercept",  body: "GitHub sends PR events to DriftGuard the instant an agent pushes. No polling.", color: "var(--dg-electric)" },
              { step: "02", title: "Parallel analysis",  body: "Cost (Infracost), security (Checkov), drift (STS), and compliance run concurrently — not sequentially.", color: "var(--dg-warned)" },
              { step: "03", title: "Memory recall",      body: "pgvector cosine search matches the diff against every prior incident. If this pattern broke prod before, it shows up.", color: "var(--dg-purple)" },
              { step: "04", title: "Hard gate",          body: "A GitHub Check Run blocks the merge button. The agent cannot self-approve. Human review required above risk threshold 70.", color: "var(--dg-blocked)" },
            ].map((s) => (
              <div key={s.step} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold" style={{ color: s.color }}>
                    {s.step}
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-[color:var(--dg-fg)] mb-1">{s.title}</div>
                    <p className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)]">{s.body}</p>
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
