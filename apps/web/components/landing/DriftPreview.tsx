"use client";

import { useT } from "@/components/TranslationProvider";

import { useState } from "react";
import { SectionHeader } from "./Architecture";

const TABS = ["PR Analysis", "Drift State", "FinOps"] as const;
type Tab = (typeof TABS)[number];

const PR_ROWS = [
  {
    resource: "aws_rds_cluster.prod",
    change: { from: "db.r5.large", to: "db.r5.4xlarge" },
    severity: "high" as const,
    cost: "+€480/mo",
    finding: "Instance resize — 4× cost delta",
    action: "blocked",
  },
  {
    resource: "aws_s3_bucket.tf-state",
    change: { flag: "Public access block removed" },
    severity: "critical" as const,
    cost: null,
    finding: "CKV_AWS_19 · NIS2 Art.21 · ISO 27001 A.8.24",
    action: "blocked",
  },
  {
    resource: "aws_security_group.web",
    change: { flag: "Ingress 0.0.0.0/0 on port 22" },
    severity: "high" as const,
    cost: null,
    finding: "CKV_AWS_24 · DORA Art.9",
    action: "warned",
  },
  {
    resource: "aws_lambda_function.api",
    change: { from: "128 MB", to: "256 MB" },
    severity: "low" as const,
    cost: "+€2/mo",
    finding: "Memory increase — within threshold",
    action: "allowed",
  },
];

const DRIFT_ROWS = [
  { resource: "aws_rds_cluster.prod", plan: "db.r5.large", live: "db.r5.xlarge", delta: "Manual resize in console" },
  { resource: "aws_security_group.app", plan: "port 443 only", live: "+ port 8080 ingress", delta: "Added via ClickOps" },
  { resource: "aws_instance.bastion", plan: "exists", live: "terminated", delta: "Deleted without Terraform" },
];

const FINOPS_ROWS = [
  { resource: "aws_rds_cluster.prod", planned: "€320/mo", actual: "€800/mo", waste: "+€480/mo" },
  { resource: "aws_ec2.legacy-worker", planned: "€0", actual: "€210/mo", waste: "untracked" },
  { resource: "aws_elasticache.redis", planned: "€45/mo", actual: "€90/mo", waste: "+€45/mo" },
];

const SEVERITY_STYLE = {
  critical: "bg-blocked/10 text-blocked border-blocked/30",
  high:     "bg-[color:var(--dg-severity-high)]/10 text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30",
  medium:   "bg-warned/10 text-warned border-warned/30",
  low:      "bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]",
} as const;

const ACTION_STYLE = {
  blocked: "text-blocked",
  warned:  "text-warned",
  allowed: "text-allowed",
} as const;

const ACTION_ICON = {
  blocked: "✗",
  warned:  "⚠",
  allowed: "✓",
} as const;

export function DriftPreview() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("PR Analysis");

  return (
    <section className="py-20 sm:py-28 border-t border-[color:var(--dg-border)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="PR review"
          title={t("landing.driftPreview.sectionAriaLabel")}
          subtitle="Four analysis engines run in parallel — cost delta (Infracost), security (Checkov), live drift (STS), and compliance mapping. Results appear in the PR within 2 seconds."
        />

        <div className="mt-10">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-px">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest rounded-t border-x border-t transition-colors ${
                  tab === t
                    ? "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)]"
                    : "border-transparent text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="rounded-b rounded-tr border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[color:var(--dg-border)] border-b border-[color:var(--dg-border)]">
              {tab === "PR Analysis" && (
                <>
                  <Stat label="Risk score" value="82" accent="text-blocked" />
                  <Stat label="Findings" value="4" />
                  <Stat label="Cost delta" value="+€482/mo" accent="text-warned" />
                  <Stat label="Frameworks hit" value="3" />
                </>
              )}
              {tab === "Drift State" && (
                <>
                  <Stat label="Drifted resources" value="3" accent="text-warned" />
                  <Stat label="Untracked" value="1" accent="text-blocked" />
                  <Stat label="In sync" value="47" accent="text-allowed" />
                  <Stat label="Last scan" value="2 min ago" />
                </>
              )}
              {tab === "FinOps" && (
                <>
                  <Stat label="Planned" value="€365/mo" />
                  <Stat label="Actual" value="€1,100/mo" accent="text-blocked" />
                  <Stat label="Drift waste" value="+€735/mo" accent="text-warned" />
                  <Stat label="Untracked" value="€210/mo" accent="text-blocked" />
                </>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {tab === "PR Analysis" && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]">
                      <Th>{t("landing.driftPreview.colResource")}</Th>
                      <Th>{t("landing.driftPreview.colChange")}</Th>
                      <Th>{t("landing.driftPreview.colFinding")}</Th>
                      <Th>Cost</Th>
                      <Th align="right">Gate</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--dg-border)]">
                    {PR_ROWS.map((row) => (
                      <tr key={row.resource} className="bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              row.severity === "critical" ? "bg-blocked" :
                              row.severity === "high" ? "bg-[color:var(--dg-severity-high)]" :
                              "bg-[color:var(--dg-fg-subtle)]"
                            }`} />
                            <code className="font-mono text-[11px] text-[color:var(--dg-fg)] truncate max-w-[120px] sm:max-w-[200px]">
                              {row.resource}
                            </code>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {"flag" in (row.change ?? {}) ? (
                            <span className="font-mono text-[11px] text-blocked">{(row.change as any).flag}</span>
                          ) : (
                            <span className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="line-through text-[color:var(--dg-fg-subtle)]">{(row.change as any).from}</span>
                              <span className="text-[color:var(--dg-fg-subtle)]">→</span>
                              <span className="text-warned">{(row.change as any).to}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[10px] text-[color:var(--dg-fg-muted)]">{row.finding}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-[11px] ${row.cost ? "text-warned" : "text-[color:var(--dg-fg-subtle)]"}`}>
                            {row.cost ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-mono text-[11px] font-semibold ${ACTION_STYLE[row.action as keyof typeof ACTION_STYLE]}`}>
                            {ACTION_ICON[row.action as keyof typeof ACTION_ICON]} {row.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "Drift State" && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]">
                      <Th>{t("landing.driftPreview.colResource")}</Th>
                      <Th>{t("landing.driftPreview.colPlan")}</Th>
                      <Th>{t("landing.driftPreview.colLiveState")}</Th>
                      <Th>{t("landing.driftPreview.delta")}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--dg-border)]">
                    {DRIFT_ROWS.map((row) => (
                      <tr key={row.resource} className="bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition-colors">
                        <td className="px-4 py-3.5">
                          <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">{row.resource}</code>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">{row.plan}</td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-warned">{row.live}</td>
                        <td className="px-4 py-3.5 font-mono text-[10px] text-[color:var(--dg-fg-muted)]">{row.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === "FinOps" && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]">
                      <Th>{t("landing.driftPreview.colResource")}</Th>
                      <Th>{t("landing.driftPreview.colPlanned")}</Th>
                      <Th>{t("landing.driftPreview.colActual")}</Th>
                      <Th>{t("landing.driftPreview.waste")}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--dg-border)]">
                    {FINOPS_ROWS.map((row) => (
                      <tr key={row.resource} className="bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition-colors">
                        <td className="px-4 py-3.5">
                          <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">{row.resource}</code>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[color:var(--dg-fg-muted)]">{row.planned}</td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[color:var(--dg-fg)]">{row.actual}</td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-warned font-semibold">{row.waste}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-4 py-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                {tab === "PR Analysis" && "Review posted in 18s · risk 82/100 · 2 controls failed"}
                {tab === "Drift State" && "State fetched via STS AssumeRole · scan interval 5 min"}
                {tab === "FinOps" && "Infracost + live billing API · updated hourly"}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
                live data
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[color:var(--dg-canvas)] px-5 py-4">
      <div className="dg-label">{label}</div>
      <div className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${accent ?? "text-[color:var(--dg-fg)]"}`}>
        {value}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] font-normal ${align === "right" ? "text-right" : ""}`}>
      {children}
    </th>
  );
}
