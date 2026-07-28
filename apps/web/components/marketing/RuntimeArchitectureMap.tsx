"use client";

import { motion } from "framer-motion";
import {
  FileCode2,
  DollarSign,
  ShieldAlert,
  GitCompareArrows,
  Brain,
  ShieldCheck,
  GitPullRequest,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { fadeUp, staggerContainer, VIEWPORT_ONCE } from "@/lib/motion/variants";
import { STAGGER } from "@/lib/motion/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

interface Engine {
  key: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}

// The six analysis engines DriftGuard runs on every Terraform/OpenTofu pull
// request, in execution order (plan parsing first, policy gate last — the
// four in between run in parallel).
const ENGINES: Engine[] = [
  { key: "plan", icon: FileCode2, label: "Plan parsed", detail: "terraform plan → typed resource graph" },
  { key: "cost", icon: DollarSign, label: "Cost delta", detail: "Infracost diff vs. current state" },
  { key: "security", icon: ShieldAlert, label: "Security scan", detail: "Checkov policy checks" },
  { key: "drift", icon: GitCompareArrows, label: "Drift check", detail: "plan vs. live cloud state" },
  { key: "memory", icon: Brain, label: "Semantic recall", detail: "related past incidents" },
  { key: "policy", icon: ShieldCheck, label: "Policy gate", detail: ".github/driftguard.yml verdict" },
];

function EngineNode({ engine }: { engine: Engine }) {
  const Icon = engine.icon;
  return (
    <motion.div
      variants={fadeUp({ distance: 10 })}
      className="flex items-center gap-3 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] px-4 py-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--dg-electric)_40%,transparent)] bg-[color-mix(in_srgb,var(--dg-electric)_10%,transparent)] text-[color:var(--dg-electric-bright)]">
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[11px] font-medium uppercase tracking-wide text-white">
          {engine.label}
        </div>
        <div className="truncate font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          {engine.detail}
        </div>
      </div>
    </motion.div>
  );
}

export function RuntimeArchitectureMap() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-start gap-12">
      <Reveal className="flex-1 w-full lg:sticky lg:top-28">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Architecture
        </h2>
        <h3 className="text-4xl font-medium text-white mb-6 leading-tight">
          Six analyses, one merge verdict
        </h3>
        <p className="text-[color:var(--dg-fg-muted)] mb-8">
          When a pull request opens, DriftGuard parses the Terraform or OpenTofu plan and runs its
          analyses in parallel — cost, security, drift, and semantic memory — then evaluates your
          policy and posts a single allow / warn / block result as a GitHub Check.
        </p>
        <ul className="space-y-4 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest">
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Parallel analysis engines
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Semantic incident recall
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            Deterministic policy gating
          </li>
        </ul>
      </Reveal>

      {/* Single viewport observer drives the whole diagram's stagger —
          replaces 8 independent whileInView triggers (source + 6 engines +
          verdict) with one, propagated to children via variants. */}
      <motion.div
        initial={reduceMotion ? undefined : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={VIEWPORT_ONCE}
        variants={reduceMotion ? undefined : staggerContainer(STAGGER.base)}
        className="flex-1 w-full rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-5 sm:p-6"
      >
        {/* Source */}
        <motion.div
          variants={fadeUp({ distance: 10 })}
          className="mb-4 flex items-center gap-3 rounded-md border border-[color-mix(in_srgb,var(--dg-warned)_40%,transparent)] bg-[color-mix(in_srgb,var(--dg-warned)_10%,transparent)] px-4 py-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--dg-warned)_40%,transparent)] text-[color:var(--dg-warned)]">
            <GitPullRequest className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <div className="font-mono text-[11px] font-medium uppercase tracking-wide text-white">
            Pull request opened
          </div>
        </motion.div>

        {/* Connector */}
        <div className="mb-4 ml-[22px] h-4 w-px bg-[color:var(--dg-border-strong)]" aria-hidden="true" />

        {/* Six engines */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ENGINES.map((engine) => (
            <EngineNode key={engine.key} engine={engine} />
          ))}
        </div>

        {/* Connector */}
        <div className="my-4 ml-[22px] h-4 w-px bg-[color:var(--dg-border-strong)]" aria-hidden="true" />

        {/* Verdict */}
        <motion.div
          variants={fadeUp({ distance: 10 })}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color-mix(in_srgb,var(--dg-electric)_40%,transparent)] bg-[color-mix(in_srgb,var(--dg-electric)_10%,transparent)] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--dg-electric)_40%,transparent)] text-[color:var(--dg-electric-bright)]">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
            </span>
            <div className="font-mono text-[11px] font-medium uppercase tracking-wide text-white">
              GitHub Check posted
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            [ plan → analyses → policy → check ]
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
