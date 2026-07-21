"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { GitPullRequest, ShieldCheck, GitMerge } from "lucide-react";

type Phase = "idle" | "evaluating" | "blocked";

function nodeLabel(Icon: typeof ShieldCheck, title: string, colorVar: string) {
  return (
    <div className="flex flex-col items-center p-2">
      <Icon className="w-6 h-6 mb-2" style={{ color: `var(${colorVar})` }} />
      <span className="font-mono text-[10px] uppercase text-[color:var(--dg-fg)]">{title}</span>
    </div>
  );
}

const initialNodes = [
  {
    id: "pr",
    type: "default",
    data: { label: nodeLabel(GitPullRequest, "Pull Request", "--dg-warned") },
    position: { x: 80, y: 150 },
    className: "border-2 border-[color:var(--dg-warned)] !bg-[color:var(--dg-surface)] rounded",
  },
  {
    id: "driftguard",
    type: "default",
    data: { label: nodeLabel(ShieldCheck, "DriftGuard review", "--dg-electric-bright") },
    position: { x: 340, y: 150 },
    className:
      "border-2 border-[color:var(--dg-electric)] !bg-[color:var(--dg-surface-raised)] shadow-[0_0_20px_rgba(63,140,255,0.3)] rounded",
  },
  {
    id: "merge",
    type: "default",
    data: { label: nodeLabel(GitMerge, "Merge to main", "--dg-allowed") },
    position: { x: 600, y: 150 },
    className: "border border-[color:var(--dg-border-strong)] !bg-[color:var(--dg-surface)] rounded",
  },
];

const okEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  animated: true,
  style: { stroke: "var(--dg-allowed)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-allowed)" },
});

const blockEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  animated: false,
  style: { stroke: "var(--dg-blocked)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-blocked)" },
});

const initialEdges: Edge[] = [okEdge("e-dg-merge", "driftguard", "merge")];

export function PolicySimulatorDemo() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [phase, setPhase] = useState<Phase>("idle");

  // Deterministic review outcome: a public-S3 finding fails the policy gate.
  const runReview = useCallback(() => {
    setPhase("evaluating");
    setEdges([
      { ...okEdge("e-pr-dg", "pr", "driftguard"), style: { stroke: "var(--dg-warned)", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-warned)" } },
      okEdge("e-dg-merge", "driftguard", "merge"),
    ]);
    window.setTimeout(() => {
      setPhase("blocked");
      setEdges([
        blockEdge("e-pr-dg", "pr", "driftguard"),
        blockEdge("e-dg-merge", "driftguard", "merge"),
      ]);
    }, 1400);
  }, [setEdges]);

  const reset = useCallback(() => {
    setPhase("idle");
    setEdges(initialEdges);
  }, [setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (params.source === "pr" && params.target === "driftguard") {
        runReview();
      } else {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [runReview, setEdges],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          How it works
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">The policy gate, live</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-xl">
          Run a review — or drag the Pull Request into DriftGuard. It parses the Terraform plan,
          checks cost, security and drift, recalls prior incidents, evaluates{" "}
          <span className="font-mono text-[color:var(--dg-fg)]">.github/driftguard.yml</span>, and
          returns an allow / warn / block verdict on the GitHub Check.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={runReview}
          disabled={phase === "evaluating"}
          className="dg-button dg-button-primary text-[12px] disabled:opacity-60"
        >
          {phase === "evaluating" ? "Reviewing…" : "Run review"}
        </button>
        <button onClick={reset} className="dg-button dg-button-ghost text-[12px]">
          Reset
        </button>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          Interactive demo · example PR
        </span>
      </div>

      <div className="h-[460px] w-full border border-[color:var(--dg-border-strong)] rounded-lg bg-[color:var(--dg-canvas)] relative overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
        {/* Verdict log */}
        <div className="absolute top-4 left-4 z-10 bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border)] rounded px-4 py-3 font-mono text-[11px] min-w-[280px]" aria-live="polite">
          <div className="text-[color:var(--dg-fg-subtle)] uppercase tracking-widest mb-3 border-b border-[color:var(--dg-border)] pb-2">
            GitHub Check · DriftGuard
          </div>
          {phase === "idle" && (
            <div className="text-[color:var(--dg-fg-muted)]">Awaiting pull request…</div>
          )}
          {phase === "evaluating" && (
            <div className="text-[color:var(--dg-warned)] animate-pulse">
              Parsing plan · evaluating policy…
            </div>
          )}
          {phase === "blocked" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <div className="text-[color:var(--dg-blocked)]">✗ BLOCK — 1 policy violation</div>
              <div className="text-[color:var(--dg-fg-subtle)] text-[10px]">security · aws_s3_bucket.assets = public-read</div>
              <div className="text-[color:var(--dg-fg-subtle)] text-[10px]">rule: block · no-public-buckets</div>
              <div className="text-[color:var(--dg-fg-subtle)] text-[10px]">cost Δ +€124/mo · drift 3 resources</div>
            </motion.div>
          )}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-[color:var(--dg-canvas)]"
        >
          <Background color="var(--dg-border-strong)" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}
