"use client";

import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Minus, MinusCircle } from "lucide-react";
import { Reveal } from "./Reveal";
import { staggerContainer, VIEWPORT_ONCE } from "@/lib/motion/variants";
import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Illustrative mapping of the checks DriftGuard runs on a Terraform/OpenTofu PR
// to the control families of the frameworks it supports. Deterministic — this
// is an example of coverage, not live tenant data.
const FRAMEWORKS = ["DORA", "NIS2", "ISO 27001", "SOC 2"] as const;
const CHECKS = ["Security", "Cost", "Drift", "IAM", "Encryption", "Network"] as const;

type Status = "evidence" | "partial" | "na";

// evidence = evidence emitted, partial = partial / advisory, na = not applicable
const COVERAGE: Record<(typeof CHECKS)[number], Status[]> = {
  Security:   ["evidence", "evidence", "evidence", "evidence"],
  Cost:       ["partial",  "na",       "partial",  "partial"],
  Drift:      ["evidence", "evidence", "evidence", "partial"],
  IAM:        ["evidence", "evidence", "evidence", "evidence"],
  Encryption: ["partial",  "evidence", "evidence", "evidence"],
  Network:    ["evidence", "evidence", "partial",  "partial"],
};

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; className: string }> = {
  evidence: {
    label: "Evidence emitted",
    icon: CheckCircle2,
    className:
      "bg-[color-mix(in_srgb,var(--dg-allowed)_10%,transparent)] border-[color-mix(in_srgb,var(--dg-allowed)_40%,transparent)] text-[color:var(--dg-allowed)]",
  },
  partial: {
    label: "Partial / advisory",
    icon: MinusCircle,
    className:
      "bg-[color-mix(in_srgb,var(--dg-warned)_10%,transparent)] border-[color-mix(in_srgb,var(--dg-warned)_40%,transparent)] text-[color:var(--dg-warned)]",
  },
  na: {
    label: "Not applicable",
    icon: Minus,
    className: "bg-transparent border-[color:var(--dg-border)] text-[color:var(--dg-fg-subtle)]",
  },
};

// Small, quick fade+scale for the compact status badges — shorter duration
// and a subtler scale delta than the shared fadeUp/fadeScale (which are
// tuned for larger headings/cards) so 24 cascading badges feel snappy
// rather than sluggish.
const badgeVariant: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.medium, ease: EASE.out } },
};

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${meta.className}`}
      title={meta.label}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function ComplianceHeatmap() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <Reveal className="mb-12 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Continuous compliance
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Evidence on every pull request</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl mx-auto">
          Each analysis DriftGuard runs on a Terraform or OpenTofu change emits control evidence,
          so DORA, NIS2, ISO 27001 and SOC 2 audit trails are a by-product of normal review — not a
          separate spreadsheet exercise.
        </p>
      </Reveal>

      <div className="relative rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
        {/* Horizontal scroll is intentional on narrow viewports — the first
            column (check name) stays pinned via `sticky` so context never scrolls away.
            The right-edge fade hints there's more to scroll. */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 rounded-r-lg bg-gradient-to-l from-[color:var(--dg-surface)] to-transparent sm:hidden"
          aria-hidden="true"
        />
        <div className="overflow-x-auto rounded-lg [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[560px] border-collapse">
            <caption className="sr-only">
              Evidence coverage of DriftGuard&rsquo;s pull-request checks against DORA, NIS2, ISO 27001 and SOC 2
            </caption>
            <thead>
              <tr className="border-b border-[color:var(--dg-border)]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-[color:var(--dg-surface)] px-5 py-4 text-left font-mono text-[11px] font-medium uppercase tracking-wider text-[color:var(--dg-fg-subtle)]"
                >
                  Check
                </th>
                {FRAMEWORKS.map((f) => (
                  <th
                    key={f}
                    scope="col"
                    className="px-3 py-4 text-center font-mono text-[11px] font-medium uppercase tracking-wider text-[color:var(--dg-fg-subtle)]"
                  >
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Single viewport observer for the whole table drives every
                badge's stagger via inherited variants — replaces 24
                independent whileInView triggers with one. */}
            <motion.tbody
              initial={reduceMotion ? undefined : "hidden"}
              whileInView={reduceMotion ? undefined : "visible"}
              viewport={VIEWPORT_ONCE}
              variants={reduceMotion ? undefined : staggerContainer(STAGGER.tight)}
            >
              {CHECKS.map((check, i) => (
                <tr
                  key={check}
                  className={i > 0 ? "border-t border-[color:var(--dg-border)]" : undefined}
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[color:var(--dg-surface)] px-5 py-3 text-left font-mono text-[12px] font-medium uppercase tracking-wide text-[color:var(--dg-fg)]"
                  >
                    {check}
                  </th>
                  {COVERAGE[check].map((status, j) => (
                    <td key={j} className="px-3 py-2.5 text-center">
                      <motion.span variants={badgeVariant} className="inline-flex">
                        <StatusBadge status={status} />
                      </motion.span>
                    </td>
                  ))}
                </tr>
              ))}
            </motion.tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[color:var(--dg-border)] px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {(Object.keys(STATUS_META) as Status[]).map((s) => {
            const meta = STATUS_META[s];
            const Icon = meta.icon;
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${meta.className}`}>
                  <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                </span>
                {meta.label}
              </div>
            );
          })}
          <span className="ml-auto opacity-60 normal-case tracking-normal">Illustrative coverage</span>
        </div>
      </div>
    </div>
  );
}
