"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { PIPELINE_STEPS } from "@/lib/demo/pipeline";
import { useIsMobileViewport } from "@/lib/motion/useIsMobileViewport";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Code-split: three.js + @react-three/fiber + drei only ship to devices
// that actually render the globe (desktop/tablet, motion not reduced).
const HeroGlobe = dynamic(() => import("./HeroGlobe"), { ssr: false });

const VERDICT_COLOR: Record<string, string> = {
  ALLOW: "var(--dg-allowed, #22d38d)",
  WARN: "var(--dg-warned, #f5a623)",
  BLOCK: "var(--dg-blocked, #ef4444)",
};

function ReviewFeed() {
  // SSR-safe: false on the server and on the client's first render (so
  // hydration never has to reconcile a mismatched initial state), then
  // syncs to the real value via an effect.
  const reduceMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setTick(PIPELINE_STEPS.length); // jump straight to the full, static feed
      return;
    }
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % (PIPELINE_STEPS.length + 2));
    }, 1100);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const shown = PIPELINE_STEPS.slice(0, Math.min(tick, PIPELINE_STEPS.length));

  return (
    <div className="absolute right-6 bottom-6 hidden w-80 rounded border border-[color:var(--dg-border-strong)] bg-[color-mix(in_srgb,var(--dg-surface)_80%,transparent)] p-4 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] backdrop-blur md:block">
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
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useIsMobileViewport();

  return (
    <div className="relative flex min-h-hero w-full flex-col items-center justify-center overflow-hidden pt-20">
      {/* 3D backdrop — decorative only. Skipped on mobile viewports in
          favor of the page's existing static grid/vignette layers, and
          skipped entirely under prefers-reduced-motion. */}
      {!reduceMotion && !isMobile && <HeroGlobe />}

      <div className="relative z-10 mx-auto mt-[-10vh] flex w-full max-w-5xl flex-col items-center px-6 text-center">
        {/*
          Entrance sequence is pure CSS (dg-page-enter + dg-stagger-N from
          globals.css), not framer-motion: it's baked into the stylesheet,
          so the headline and CTA are guaranteed to animate into place even
          if JS hydration is slow — they're never stuck at opacity:0 waiting
          on React. prefers-reduced-motion is handled globally (see the
          @media block in globals.css), so no extra JS branch is needed here.
        */}
        <div className="dg-page-enter dg-stagger-1 mb-8 inline-flex items-center gap-2 rounded-full border border-[color:var(--dg-border-bright)] bg-[color-mix(in_srgb,var(--dg-surface-overlay)_50%,transparent)] px-3 py-1 backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--dg-electric)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
            GitHub-native · Terraform &amp; OpenTofu
          </span>
        </div>

        <h1 className="dg-page-enter dg-stagger-2 mb-6 text-5xl font-medium leading-[1.1] tracking-tighter text-white md:text-7xl lg:text-8xl">
          Runtime safety for <br className="hidden md:block" />
          the Terraform your agents write
        </h1>

        <p className="dg-page-enter dg-stagger-3 mb-12 max-w-2xl text-lg text-[color:var(--dg-fg-muted)] md:text-xl">
          DriftGuard reviews every Terraform and OpenTofu pull request — written by humans or
          AI agents — for <span className="text-white">cost, security, drift, and compliance</span>,
          recalls prior incidents, and gates the merge on your policy.
        </p>

        <div className="dg-page-enter dg-stagger-4 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href={getGitHubAppInstallUrl()}
            target="_blank"
            rel="noreferrer"
            className="touch-manipulation rounded bg-white px-8 py-3.5 text-[13px] font-medium text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-colors hover:bg-white/90 active:scale-[0.97]"
          >
            Install the GitHub App
          </a>
          <Link
            href="/docs"
            className="touch-manipulation rounded border border-[color:var(--dg-border-strong)] bg-transparent px-8 py-3.5 text-[13px] font-medium text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            Read the docs
          </Link>
        </div>
      </div>

      <ReviewFeed />
    </div>
  );
}
