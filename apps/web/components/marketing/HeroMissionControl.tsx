"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, useReducedMotion } from "framer-motion";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

// Helper to generate points on a sphere for the globe backdrop.
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

// Deterministic sample of the DriftGuard review pipeline for a real PR.
// Order mirrors the actual sequence: plan parsed → analyses → policy → verdict.
const PIPELINE_STEPS: { stage: string; detail: string; verdict: "ALLOW" | "WARN" | "BLOCK" }[] = [
  { stage: "PLAN_PARSED", detail: "aws_db_instance.main", verdict: "ALLOW" },
  { stage: "COST_DELTA", detail: "+€124/mo · rds t3.large", verdict: "WARN" },
  { stage: "SECURITY_SCAN", detail: "s3 public-acl", verdict: "BLOCK" },
  { stage: "DRIFT_CHECK", detail: "3 resources out of sync", verdict: "WARN" },
  { stage: "MEMORY_RECALL", detail: "prior incident #248", verdict: "WARN" },
  { stage: "POLICY_EVAL", detail: ".github/driftguard.yml", verdict: "BLOCK" },
];

const VERDICT_COLOR: Record<string, string> = {
  ALLOW: "var(--dg-allowed, #22d38d)",
  WARN: "var(--dg-warned, #f5a623)",
  BLOCK: "var(--dg-blocked, #ef4444)",
};

function ReviewFeed() {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(reduceMotion ? PIPELINE_STEPS.length : 0);

  useEffect(() => {
    if (reduceMotion) return; // show the full, static feed — no timers
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % (PIPELINE_STEPS.length + 2));
    }, 1100);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const shown = PIPELINE_STEPS.slice(0, Math.min(tick, PIPELINE_STEPS.length));

  return (
    <div className="absolute right-6 bottom-6 hidden w-80 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/80 p-4 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] backdrop-blur md:block">
      <div className="mb-2 flex items-center justify-between border-b border-[color:var(--dg-border)] pb-2 uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
        <span>PR #482 · review feed</span>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--dg-electric)]" />
      </div>
      <div className="min-h-[92px] space-y-1">
        {shown.map((s, i) => (
          <motion.div
            key={s.stage}
            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between gap-2 truncate"
          >
            <span className="truncate">
              <span className="text-[color:var(--dg-fg-muted)]">{s.stage}</span>{" "}
              <span className="opacity-60">{s.detail}</span>
            </span>
            <span style={{ color: VERDICT_COLOR[s.verdict] }}>{s.verdict}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-2 border-t border-[color:var(--dg-border)] pt-2 text-[9px] uppercase tracking-widest opacity-60">
        Interactive demo · example PR
      </div>
    </div>
  );
}

export function HeroMissionControl() {
  const reduceMotion = useReducedMotion();
  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: "easeOut" as const },
        };

  return (
    <div className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden pt-20">
      {/* 3D backdrop — decorative only */}
      {!reduceMotion && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-screen" aria-hidden="true">
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
            <GlobePoints />
          </Canvas>
        </div>
      )}

      <div className="relative z-10 mx-auto mt-[-10vh] flex w-full max-w-5xl flex-col items-center px-6 text-center">
        <motion.div
          {...fade(0)}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[color:var(--dg-border-bright)] bg-[color:var(--dg-surface-overlay)]/50 px-3 py-1 backdrop-blur-sm"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--dg-electric)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
            GitHub-native · Terraform &amp; OpenTofu
          </span>
        </motion.div>

        <motion.h1
          {...fade(0.1)}
          className="mb-6 text-5xl font-medium leading-[1.1] tracking-tighter text-white md:text-7xl lg:text-8xl"
        >
          Runtime safety for <br className="hidden md:block" />
          the Terraform your agents write
        </motion.h1>

        <motion.p
          {...fade(0.2)}
          className="mb-12 max-w-2xl text-lg text-[color:var(--dg-fg-muted)] md:text-xl"
        >
          DriftGuard reviews every Terraform and OpenTofu pull request — written by humans or
          AI agents — for <span className="text-white">cost, security, drift, and compliance</span>,
          recalls prior incidents, and gates the merge on your policy.
        </motion.p>

        <motion.div {...fade(0.3)} className="flex flex-col items-center gap-4 sm:flex-row">
          <a
            href={getGitHubAppInstallUrl()}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-white px-8 py-3.5 text-[13px] font-medium text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-colors hover:bg-white/90"
          >
            Install the GitHub App
          </a>
          <Link
            href="/docs"
            className="rounded border border-[color:var(--dg-border-strong)] bg-transparent px-8 py-3.5 text-[13px] font-medium text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)]"
          >
            Read the docs
          </Link>
        </motion.div>
      </div>

      <ReviewFeed />
    </div>
  );
}
