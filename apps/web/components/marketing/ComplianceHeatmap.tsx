"use client";

import { motion, useReducedMotion } from "framer-motion";

// Illustrative mapping of the checks DriftGuard runs on a Terraform/OpenTofu PR
// to the control families of the frameworks it supports. Deterministic — this
// is an example of coverage, not live tenant data.
const FRAMEWORKS = ["DORA", "NIS2", "ISO 27001", "SOC 2"];
const CHECKS = ["Security", "Cost", "Drift", "IAM", "Encryption", "Network"];

// coverage: 2 = evidence emitted, 1 = partial / advisory, 0 = not applicable
const COVERAGE: Record<string, number[]> = {
  Security:   [2, 2, 2, 2],
  Cost:       [1, 0, 1, 1],
  Drift:      [2, 2, 2, 1],
  IAM:        [2, 2, 2, 2],
  Encryption: [1, 2, 2, 2],
  Network:    [2, 2, 1, 1],
};

const CELL = [
  "bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border)]",       // 0
  "bg-[color:var(--dg-warned)]/15 border border-[color:var(--dg-warned)]/50",          // 1
  "bg-[color:var(--dg-allowed)]/15 border border-[color:var(--dg-allowed)]/50",        // 2
];

export function ComplianceHeatmap() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Continuous compliance
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Evidence on every pull request</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl mx-auto">
          Each analysis DriftGuard runs on a Terraform or OpenTofu change emits control evidence,
          so DORA, NIS2, ISO 27001 and SOC 2 audit trails are a by-product of normal review — not a
          separate spreadsheet exercise.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px] border border-[color:var(--dg-border-strong)] rounded-lg bg-[color:var(--dg-surface)] p-6">
          {/* Column headers */}
          <div className="flex items-end gap-2 pl-28 mb-3">
            {FRAMEWORKS.map((f) => (
              <div key={f} className="flex-1 text-center font-mono text-[11px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)]">
                {f}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {CHECKS.map((check, i) => (
              <div key={check} className="flex items-center gap-2">
                <div className="w-28 shrink-0 font-mono text-[11px] uppercase text-right text-[color:var(--dg-fg-muted)]">
                  {check}
                </div>
                <div className="flex flex-1 gap-2">
                  {COVERAGE[check].map((level, j) => (
                    <motion.div
                      key={j}
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: (i * FRAMEWORKS.length + j) * 0.02 }}
                      className={`h-8 flex-1 rounded ${CELL[level]}`}
                      aria-label={`${check} × ${FRAMEWORKS[j]}: ${["not applicable", "partial", "evidence"][level]}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] uppercase">
            <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded ${CELL[2]}`} /> Evidence emitted</div>
            <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded ${CELL[1]}`} /> Partial / advisory</div>
            <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded ${CELL[0]}`} /> Not applicable</div>
            <span className="opacity-60">Illustrative coverage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
