"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// Helper to generate points on a sphere for the Globe
function generateGlobePoints(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
    positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function GlobePoints() {
  const ref = useRef<THREE.Points>(null);
  const [positions] = useState(() => generateGlobePoints(3000, 2.5));

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.1;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#3f8cff"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

function LiveDataTicker() {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const actions = ["AUTH_INIT", "POLICY_CHECK", "DRIFT_DETECT", "SIG_VERIFY"];
    const agents = ["agent-v4.1", "ci-bot", "deploy-worker", "terraform-01"];
    const interval = setInterval(() => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const ms = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const event = `[${new Date().toISOString().split("T")[1].replace("Z", "")}:${ms}] ${action} ${agent} \u2192 ALLOWED`;
      
      setEvents(prev => [event, ...prev].slice(0, 5));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute right-6 bottom-6 w-80 p-4 border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/80 backdrop-blur rounded font-mono text-[10px] text-[color:var(--dg-fg-subtle)] overflow-hidden">
      <div className="text-[color:var(--dg-electric-bright)] mb-2 uppercase tracking-widest border-b border-[color:var(--dg-border)] pb-2 flex items-center justify-between">
        <span>Identity Registry Feed</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--dg-electric)] animate-pulse" />
      </div>
      <div className="space-y-1 h-[70px]">
        {events.map((e, i) => (
          <motion.div
            key={e + i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1 - i * 0.2, x: 0 }}
            className="truncate"
          >
            {e}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function HeroMissionControl() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center pt-20 overflow-hidden min-h-[90vh]">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <GlobePoints />
        </Canvas>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 w-full flex flex-col items-center text-center mt-[-10vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 mb-8 border border-[color:var(--dg-border-bright)] rounded-full bg-[color:var(--dg-surface-overlay)]/50 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[color:var(--dg-electric)] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
            System Online • 99.999% Trust
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter text-white mb-6 leading-[1.1]"
        >
          The Runtime <br className="hidden md:block" />
          Governance Layer
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-[color:var(--dg-fg-muted)] max-w-2xl mb-12"
        >
          DriftGuard provides cryptographically secure, policy-as-code enforcement for autonomous AI systems. Not an application. <span className="text-white">Infrastructure.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button className="px-8 py-3.5 rounded bg-white text-black font-medium text-[13px] hover:bg-white/90 transition-colors shadow-[0_0_24px_rgba(255,255,255,0.2)]">
            Initialize Cluster
          </button>
          <button className="px-8 py-3.5 rounded border border-[color:var(--dg-border-strong)] bg-transparent text-[color:var(--dg-fg)] font-medium text-[13px] hover:bg-[color:var(--dg-surface-raised)] transition-colors">
            Read the Whitepaper
          </button>
        </motion.div>
      </div>

      <LiveDataTicker />
    </div>
  );
}
