"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { PIPELINE_STEPS, VERDICT_COLOR } from "@/lib/demo/pipeline";
import { useIsMobileViewport } from "@/lib/motion/useIsMobileViewport";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Code-split: three.js + @react-three/fiber + drei only ship to devices
// that actually render the globe (desktop/tablet, motion not reduced).
const HeroGlobe = dynamic(() => import("./HeroGlobe"), { ssr: false });

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
    <div className="relative flex min-h-hero w-full flex-col items-center justify-center overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20 sm:pb-0">
      {/* 3D backdrop — decorative only. Skipped on mobile viewports in
          favor of the page's existing static grid/vignette layers, and
          skipped entirely under prefers-reduced-motion. */}
      {!reduceMotion && !isMobile && <HeroGlobe />}

      {/* The -10vh centering nudge is desktop-only (md:) — on mobile it
          fought with dynamic browser-chrome viewport changes (the exact
          100vh-class bug this file otherwise avoids via .min-h-hero's
          dvh), so mobile just centers within the natural flow instead. */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center md:mt-[-10vh]">
        {/*
          Entrance sequence is pure CSS (dg-page-enter + dg-stagger-N from
          globals.css), not framer-motion: it's baked into the stylesheet,
          so the headline and CTA are guaranteed to animate into place even
          if JS hydration is slow — they're never stuck at opacity:0 waiting
          on React. prefers-reduced-motion is handled globally (see the
          @media block in globals.css), so no extra JS branch is needed here.
        */}
        <div className="dg-page-enter dg-stagger-1 mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--dg-border-bright)] bg-[color-mix(in_srgb,var(--dg-surface-overlay)_50%,transparent)] px-3 py-1 backdrop-blur-sm sm:mb-8">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--dg-electric)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
            GitHub-native · Terraform &amp; OpenTofu
          </span>
        </div>

        {/* Mobile size is fluid via clamp() — roughly 38px at 320px wide up
            to 52px by ~460px wide, vs. the old fixed 48px that wrapped this
            headline into 5-6 lines on common phone widths. text-balance
            lets the browser choose break points instead of a hardcoded
            <br>. md:text-7xl/lg:text-8xl are untouched from the desktop
            layout — deliberately not adding md:/lg: leading overrides,
            since Tailwind's text-7xl/8xl already bundle their own
            line-height and that's what the original desktop relied on. */}
        <h1 className="dg-page-enter dg-stagger-2 mb-3 text-balance text-[clamp(2.375rem,0.375rem_+_10vw,3.25rem)] font-medium leading-[1.02] tracking-tighter text-white sm:mb-6 md:text-7xl lg:text-8xl">
          Runtime safety for <br className="hidden md:block" />
          the Terraform your agents write
        </h1>

        {/* leading-[1.5] is mobile-only (matches the 1.45-1.6 target); md:
            restores text-xl's own bundled 1.4 line-height exactly, so
            desktop typography is byte-for-byte unchanged. */}
        <p className="dg-page-enter dg-stagger-3 mb-6 max-w-2xl text-lg leading-[1.5] text-[color:var(--dg-fg-muted)] sm:mb-12 md:text-xl md:leading-[1.4]">
          DriftGuard reviews every Terraform and OpenTofu pull request — written by humans or
          AI agents — for <span className="text-white">cost, security, drift, and compliance</span>,
          recalls prior incidents, and gates the merge on your policy.
        </p>

        <div className="dg-page-enter dg-stagger-4 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
          <a
            href={getGitHubAppInstallUrl()}
            target="_blank"
            rel="noreferrer"
            className="touch-manipulation inline-flex min-h-[56px] w-full items-center justify-center rounded bg-white px-8 text-[13px] font-medium text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-colors hover:bg-white/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--dg-canvas)] sm:min-h-0 sm:w-auto sm:py-3.5"
          >
            Install the GitHub App
          </a>
          <Link
            href="#demo"
            className="touch-manipulation inline-flex min-h-[56px] w-full items-center justify-center rounded border border-[color:var(--dg-border-strong)] bg-transparent px-8 text-[13px] font-medium text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dg-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--dg-canvas)] sm:min-h-0 sm:w-auto sm:py-3.5"
          >
            Run a governed PR review
          </Link>
        </div>

        <div className="dg-page-enter dg-stagger-4 mt-4 flex w-full max-w-sm flex-col items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] sm:mt-5 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4">
          <Link
            href="/docs"
            className="touch-manipulation flex min-h-[44px] items-center underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Read the docs
          </Link>
          <span aria-hidden="true" className="hidden opacity-40 sm:inline">·</span>
          <Link
            href="#briefing"
            className="touch-manipulation flex min-h-[44px] items-center underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Schedule a technical briefing
          </Link>
        </div>
      </div>

      <ReviewFeed />
    </div>
  );
}
