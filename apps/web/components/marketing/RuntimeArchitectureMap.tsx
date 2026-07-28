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
import { useT } from "@/components/TranslationProvider";

interface Engine {
  key: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}

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
  const t = useT();

  // The six analysis engines DriftGuard runs on every Terraform/OpenTofu pull
  // request, in execution order (plan parsing first, policy gate last — the
  // four in between run in parallel).
  const ENGINES: Engine[] = [
    { key: "plan", icon: FileCode2, label: t("marketing.architecture.enginePlanLabel"), detail: t("marketing.architecture.enginePlanDetail") },
    { key: "cost", icon: DollarSign, label: t("marketing.architecture.engineCostLabel"), detail: t("marketing.architecture.engineCostDetail") },
    { key: "security", icon: ShieldAlert, label: t("marketing.architecture.engineSecurityLabel"), detail: t("marketing.architecture.engineSecurityDetail") },
    { key: "drift", icon: GitCompareArrows, label: t("marketing.architecture.engineDriftLabel"), detail: t("marketing.architecture.engineDriftDetail") },
    { key: "memory", icon: Brain, label: t("marketing.architecture.engineMemoryLabel"), detail: t("marketing.architecture.engineMemoryDetail") },
    { key: "policy", icon: ShieldCheck, label: t("marketing.architecture.enginePolicyLabel"), detail: t("marketing.architecture.enginePolicyDetail") },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-start gap-12">
      <Reveal className="flex-1 w-full lg:sticky lg:top-28">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          {t("marketing.architecture.eyebrow")}
        </h2>
        <h3 className="text-4xl font-medium text-white mb-6 leading-tight">
          {t("marketing.architecture.title")}
        </h3>
        <p className="text-[color:var(--dg-fg-muted)] mb-8">
          {t("marketing.architecture.body")}
        </p>
        <ul className="space-y-4 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest">
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            {t("marketing.architecture.bullet1")}
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            {t("marketing.architecture.bullet2")}
          </li>
          <li className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-[color:var(--dg-electric)] rounded-full"></span>
            {t("marketing.architecture.bullet3")}
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
            {t("marketing.architecture.prOpened")}
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
              {t("marketing.architecture.checkPosted")}
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {t("marketing.architecture.verdictFlow")}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
