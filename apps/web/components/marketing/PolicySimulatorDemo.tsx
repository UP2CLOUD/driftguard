"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { SCENARIOS, scenarioVerdict, type Scenario } from "@/lib/demo/scenarios";
import { VERDICT_COLOR, VERDICT_LABEL, type Verdict } from "@/lib/demo/pipeline";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { DURATION, EASE } from "@/lib/motion/tokens";

type RunState = "idle" | "running" | "paused" | "done";

interface TimelineItem {
  id: string;
  kind: "meta" | "engine" | "verdict" | "check" | "audit";
  label: string;
  detail: string;
  verdict?: Verdict;
}

function buildTimeline(scenario: Scenario): TimelineItem[] {
  const verdict = scenarioVerdict(scenario);
  return [
    {
      id: "pr_opened",
      kind: "meta",
      label: "Pull request opened",
      detail: `${scenario.repo}#${scenario.prNumber} · ${scenario.title} · opened by ${scenario.author}`,
    },
    ...scenario.engines.map((e) => ({
      id: e.key,
      kind: "engine" as const,
      label: e.stage,
      detail: e.detail,
      verdict: e.verdict,
    })),
    {
      id: "verdict",
      kind: "verdict",
      label: "Verdict computed",
      detail: `${scenario.rule} → ${verdict}`,
      verdict,
    },
    {
      id: "check",
      kind: "check",
      label: "GitHub Check posted",
      detail: `driftguard/policy-gate → ${verdict}`,
      verdict,
    },
    {
      id: "audit",
      kind: "audit",
      label: "Audit log entry appended",
      detail: `event: merge_decision · pr: ${scenario.repo}#${scenario.prNumber}`,
    },
  ];
}

const RUN_INTERVAL_MS = 850;
const REDUCED_MOTION_INTERVAL_MS = 200;

function EngineRow({ item, revealed }: { item: TimelineItem; revealed: boolean }) {
  const reduceMotion = usePrefersReducedMotion();
  if (!revealed) return null;

  const dotColor = item.verdict ? VERDICT_COLOR[item.verdict] : "var(--dg-fg-subtle)";

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.medium, ease: EASE.out }}
      className="flex items-start gap-3 border-b border-[color:var(--dg-border)] py-2.5 last:border-b-0"
    >
      <span
        aria-hidden="true"
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-white">{item.label}</span>
          {item.verdict && (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: dotColor }}>
              {item.verdict}
            </span>
          )}
        </div>
        <p className="truncate font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">{item.detail}</p>
      </div>
    </motion.li>
  );
}

function DecisionInspector({ scenario, verdict }: { scenario: Scenario; verdict: Verdict }) {
  const flagged = scenario.engines.filter((e) => e.verdict !== "ALLOW");
  const clean = flagged.length === 0;

  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: `color-mix(in srgb, ${VERDICT_COLOR[verdict]} 45%, transparent)`,
        background: `color-mix(in srgb, ${VERDICT_COLOR[verdict]} 8%, transparent)`,
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          Decision inspector
        </h4>
        <span
          className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: VERDICT_COLOR[verdict], border: `1px solid ${VERDICT_COLOR[verdict]}` }}
        >
          {VERDICT_LABEL[verdict]}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Pull request
          </dt>
          <dd className="text-[color:var(--dg-fg)]">{scenario.repo}#{scenario.prNumber} — {scenario.title}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Author
          </dt>
          <dd className="text-[color:var(--dg-fg)]">{scenario.author}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {clean ? "Analysis result" : "Flagged by"}
          </dt>
          <dd className="text-[color:var(--dg-fg)]">
            {clean
              ? "All six engines returned ALLOW — no policy rule matched."
              : flagged.map((e) => `${e.stage} (${e.verdict})`).join(" · ")}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Policy rule
          </dt>
          <dd className="font-mono text-[color:var(--dg-fg)]">{scenario.rule}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Policy file
          </dt>
          <dd className="font-mono text-[color:var(--dg-fg)]">.github/driftguard.yml</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Explanation
          </dt>
          <dd className="text-[color:var(--dg-fg-muted)]">{scenario.explanation}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            Audit entry
          </dt>
          <dd className="font-mono text-[color:var(--dg-fg-muted)]">
            event: merge_decision · decision: {verdict.toLowerCase()} · pr: {scenario.repo}#{scenario.prNumber}
          </dd>
        </div>
      </dl>

      {scenario.id === "public-bucket" && (
        <Link
          href="#evidence"
          className="mt-4 inline-flex min-h-[44px] items-center font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] underline-offset-4 hover:underline"
        >
          Inspect the sealed evidence trail for this PR ↓
        </Link>
      )}
    </div>
  );
}

const RUN_CONTROL_CLASS =
  "touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded border border-[color:var(--dg-border-strong)] px-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

export function PolicySimulatorDemo() {
  const reduceMotion = usePrefersReducedMotion();
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0], [scenarioId]);
  const timeline = useMemo(() => buildTimeline(scenario), [scenario]);
  const verdict = useMemo(() => scenarioVerdict(scenario), [scenario]);

  const [stepIndex, setStepIndex] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Reset the run whenever the visitor switches scenarios.
  useEffect(() => {
    clearTimer();
    setStepIndex(0);
    setRunState("idle");
  }, [scenarioId, clearTimer]);

  // Stop the interval once every step has been revealed.
  useEffect(() => {
    if (stepIndex >= timeline.length && runState === "running") {
      clearTimer();
      setRunState("done");
    }
  }, [stepIndex, timeline.length, runState, clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setRunState("running");
    const interval = reduceMotion ? REDUCED_MOTION_INTERVAL_MS : RUN_INTERVAL_MS;
    timerRef.current = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, timeline.length));
    }, interval);
  }, [clearTimer, reduceMotion, timeline.length]);

  function pause() {
    clearTimer();
    setRunState("paused");
  }

  function restart() {
    clearTimer();
    setStepIndex(0);
    start();
  }

  function stepForward() {
    clearTimer();
    setRunState(stepIndex + 1 >= timeline.length ? "done" : "paused");
    setStepIndex((i) => Math.min(i + 1, timeline.length));
  }

  function skipToVerdict() {
    clearTimer();
    setStepIndex(timeline.length);
    setRunState("done");
  }

  function selectScenario(id: string) {
    setScenarioId(id);
  }

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % SCENARIOS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + SCENARIOS.length) % SCENARIOS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = SCENARIOS.length - 1;
    if (next !== null) {
      e.preventDefault();
      selectScenario(SCENARIOS[next].id);
      tabRefs.current[next]?.focus();
    }
  }

  const revealedCount = Math.min(stepIndex, timeline.length);
  const latestItem = revealedCount > 0 ? timeline[revealedCount - 1] : null;
  const verdictRevealed = revealedCount >= timeline.findIndex((t) => t.kind === "verdict") + 1;

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <Reveal className="mb-12">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          How it works
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Run a governed PR review</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-xl">
          Pick a scenario and step through what DriftGuard actually does when a Terraform pull request opens:
          parse the plan, run six analyses, evaluate your policy, and post a verdict — before the change reaches
          your cloud account.
        </p>
      </Reveal>

      {/* Scenario tabs — accessible tablist with roving tabindex + arrow-key nav */}
      <div
        role="tablist"
        aria-label="Simulator scenario"
        className="mb-6 flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]"
      >
        {SCENARIOS.map((s, i) => {
          const selected = s.id === scenarioId;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`scenario-tab-${s.id}`}
              aria-selected={selected}
              aria-controls={`scenario-panel-${s.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectScenario(s.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`touch-manipulation min-h-[44px] shrink-0 rounded border px-4 py-2 text-left transition-colors ${
                selected
                  ? "border-[color:var(--dg-electric)] bg-[color-mix(in_srgb,var(--dg-electric)_12%,transparent)]"
                  : "border-[color:var(--dg-border-strong)] hover:bg-[color:var(--dg-surface-raised)]"
              }`}
            >
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {s.category}
              </div>
              <div className="whitespace-nowrap text-[12px] font-medium text-[color:var(--dg-fg)]">{s.title}</div>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`scenario-panel-${scenario.id}`}
        aria-labelledby={`scenario-tab-${scenario.id}`}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Left: PR summary + diff + run controls */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {scenario.repo}#{scenario.prNumber} · demo PR, not a live tenant
            </div>
            <div className="text-[14px] font-medium text-white">{scenario.title}</div>
            <div className="mt-1 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
              opened by {scenario.author}
            </div>
          </div>

          <CodeBlock code={scenario.diff} filename="main.tf" copyLabel="Copy Terraform diff" />

          <div className="flex flex-wrap gap-2">
            {runState === "running" ? (
              <button type="button" onClick={pause} className={RUN_CONTROL_CLASS}>
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={runState === "done"}
                className={RUN_CONTROL_CLASS}
              >
                {runState === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button
              type="button"
              onClick={stepForward}
              disabled={runState === "running" || runState === "done"}
              className={RUN_CONTROL_CLASS}
            >
              Step forward
            </button>
            <button
              type="button"
              onClick={skipToVerdict}
              disabled={runState === "done"}
              className={RUN_CONTROL_CLASS}
            >
              Skip to verdict
            </button>
            <button type="button" onClick={restart} className={RUN_CONTROL_CLASS}>
              Restart
            </button>
          </div>
        </div>

        {/* Right: timeline + decision inspector */}
        <div className="flex flex-col gap-4">
          <div className="min-h-[280px] rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] p-4">
            {revealedCount === 0 ? (
              <p className="py-8 text-center font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                Press start to run the review
              </p>
            ) : (
              <ul>
                {timeline.map((item, i) => (
                  <EngineRow key={item.id} item={item} revealed={i < revealedCount} />
                ))}
              </ul>
            )}
          </div>

          {/* Announces the latest revealed step for assistive tech, without
              re-announcing the whole growing list on every tick. */}
          <div aria-live="polite" className="sr-only">
            {latestItem ? `${latestItem.label}: ${latestItem.detail}` : ""}
          </div>

          {verdictRevealed && <DecisionInspector scenario={scenario} verdict={verdict} />}
        </div>
      </div>
    </div>
  );
}
