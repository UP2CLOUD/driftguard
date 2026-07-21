"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { ShieldAlert, Database, Bot, Lock } from "lucide-react";

const initialNodes = [
  {
    id: "agent-1",
    type: "default",
    data: { 
      label: (
        <div className="flex flex-col items-center p-2">
          <Bot className="w-6 h-6 text-[color:var(--dg-blocked)] mb-2" />
          <span className="font-mono text-[10px] uppercase text-[color:var(--dg-fg)]">Rogue Agent</span>
        </div>
      ) 
    },
    position: { x: 100, y: 150 },
    className: "border-2 border-[color:var(--dg-blocked)] !bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)] rounded",
  },
  {
    id: "driftguard",
    type: "default",
    data: { 
      label: (
        <div className="flex flex-col items-center p-2">
          <Lock className="w-6 h-6 text-[color:var(--dg-electric-bright)] mb-2" />
          <span className="font-mono text-[10px] uppercase text-[color:var(--dg-electric)]">Policy Diff Engine</span>
        </div>
      ) 
    },
    position: { x: 350, y: 150 },
    className: "border-2 border-[color:var(--dg-electric)] !bg-[color:var(--dg-surface-raised)] text-white shadow-[0_0_20px_rgba(63,140,255,0.3)] rounded",
  },
  {
    id: "db-1",
    type: "default",
    data: { 
      label: (
        <div className="flex flex-col items-center p-2">
          <Database className="w-6 h-6 text-[color:var(--dg-allowed)] mb-2" />
          <span className="font-mono text-[10px] uppercase text-[color:var(--dg-fg)]">Prod DB</span>
        </div>
      ) 
    },
    position: { x: 600, y: 150 },
    className: "border border-[color:var(--dg-border-strong)] !bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)] rounded",
  },
];

const initialEdges: Edge[] = [
  { 
    id: "e-dg-db", 
    source: "driftguard", 
    target: "db-1", 
    animated: true, 
    style: { stroke: "var(--dg-allowed)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-allowed)" }
  }
];

export function PolicySimulatorDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [status, setStatus] = useState<"idle" | "evaluating" | "blocked">("idle");

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (params.source === "agent-1" && params.target === "driftguard") {
        setStatus("evaluating");
        const newEdge: Edge = {
          ...params,
          id: `e-${params.source}-${params.target}`,
          animated: true,
          style: { stroke: "var(--dg-warned)", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-warned)" }
        };
        setEdges((eds) => addEdge(newEdge, eds));
        
        setTimeout(() => {
          setStatus("blocked");
          setEdges((eds) => eds.map(e => {
            if (e.id === newEdge.id) {
              return { ...e, animated: false, style: { stroke: "var(--dg-blocked)", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "var(--dg-blocked)" } };
            }
            return e;
          }));
        }, 1500);
      } else {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [setEdges],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Runtime Sandbox
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Interactive Attack Replay</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-xl">
          Drag a connection from the Rogue Agent to the Policy Diff Engine to simulate an unauthorized mutation request. Watch how DriftGuard intercepts, evaluates, and cryptographically blocks the execution at runtime.
        </p>
      </div>

      <div className="h-[500px] w-full border border-[color:var(--dg-border-strong)] rounded-lg bg-[color:var(--dg-canvas)] relative overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
        
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border)] rounded px-4 py-3 font-mono text-[11px] min-w-[280px]">
          <div className="text-[color:var(--dg-fg-subtle)] uppercase tracking-widest mb-3 border-b border-[color:var(--dg-border)] pb-2">
            Execution Log
          </div>
          {status === "idle" && (
            <div className="text-[color:var(--dg-fg-muted)]">Awaiting telemetry...</div>
          )}
          {status === "evaluating" && (
            <div className="text-[color:var(--dg-warned)] animate-pulse">Evaluating signature policy...</div>
          )}
          {status === "blocked" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <div className="text-[color:var(--dg-blocked)]">✗ BLOCK: Unauthorized Identity</div>
              <div className="text-[color:var(--dg-fg-subtle)] text-[10px]">Policy: strict-auth-01</div>
              <div className="text-[color:var(--dg-fg-subtle)] text-[10px]">Latency: 12ms</div>
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
