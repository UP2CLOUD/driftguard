"use client";

import { useT } from "@/components/TranslationProvider";

import { useState } from "react";

const DRIFTS = [
  {
    resource: "aws_rds_cluster.prod-main",
    severity: "warn",
    dot: "bg-warned shadow-[0_0_8px_rgba(255,176,32,0.6)]",
    change: { from: "db.r5.large", to: "db.r5.xlarge" },
    detected: "DriftGuard Sync",
    age: "12m ago",
    action: { label: "Create PR", style: "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-canvas)]" },
  },
  {
    resource: "aws_s3_bucket.terraform-state",
    severity: "critical",
    dot: "bg-blocked shadow-[0_0_8px_rgba(255,71,87,0.7)]",
    change: { text: "Public access block removed" },
    detected: "AWS CloudTrail",
    age: "1h ago",
    action: { label: "Auto-revert", style: "border-blocked/30 bg-blocked/20 text-blocked hover:bg-blocked/30" },
  },
  {
    resource: "aws_security_group.web-sg",
    severity: "medium",
    dot: "bg-[color:var(--dg-fg-subtle)]",
    change: { text: "Ingress 0.0.0.0/0 port 8080 added" },
    detected: "Manual console",
    age: "3h ago",
    action: { label: "Review", style: "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-canvas)]" },
  },
  {
    resource: "aws_instance.worker-spot-03",
    severity: "medium",
    dot: "bg-[color:var(--dg-fg-subtle)]",
    change: { text: "Unmanaged instance — not in Terraform state" },
    detected: "DriftGuard scan",
    age: "6h ago",
    action: { label: "Import", style: "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-canvas)]" },
  },
];

const FINOPS = [
  { label: "Untagged resources", resources: 23, cost: "+€1,240/mo", color: "text-[color:var(--dg-severity-high)]" },
  { label: "Right-sizing opportunities", resources: 8, cost: "−€620/mo", color: "text-allowed" },
  { label: "Idle resources (>14d)", resources: 5, cost: "+€310/mo waste", color: "text-warned" },
  { label: "Drift-introduced spend", resources: 3, cost: "+€269/mo", color: "text-blocked" },
];

export function DashboardPreview() {
  const t = useT();
  const [tab, setTab] = useState<"drifts" | "finops">("drifts");

  return (
    <section className="py-20 sm:py-28 border-t border-[color:var(--dg-border)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <div className="dg-label mb-2">{t("landing.dashboardPreview.liveEnv")}</div>
            <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
              Real-time cloud state
            </h2>
            <p className="mt-2 text-[13px] text-[color:var(--dg-fg-muted)]">
              Real-time sync with AWS Account (Production)
            </p>
          </div>
          <div className="flex bg-[color:var(--dg-surface)] rounded-lg border border-[color:var(--dg-border)] p-1 gap-1 self-start sm:self-auto">
            <TabBtn active={tab === "drifts"} onClick={() => setTab("drifts")}>
              Active Drifts
              <span className="ml-1.5 rounded bg-blocked/20 px-1.5 py-0.5 font-mono text-[9px] text-blocked">
                {DRIFTS.length}
              </span>
            </TabBtn>
            <TabBtn active={tab === "finops"} onClick={() => setTab("finops")}>
              FinOps Impact
            </TabBtn>
          </div>
        </div>

        {/* Dashboard card */}
        <div className="rounded-xl border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] overflow-hidden shadow-2xl ring-1 ring-white/5">

          {/* Stats strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--dg-border)] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/50">
            <StatCell
              icon={<ActivityIcon />}
              label="Total Unmanaged Resources"
              value="12"
            />
            <StatCell
              icon={<ShieldIcon />}
              label="Security Risks Detected"
              value={<><span className="text-blocked">2</span><span className="ml-2 text-sm font-normal text-blocked/60">{t("landing.dashboardPreview.critical")}</span></>}
              tint="bg-blocked/5"
            />
            <StatCell
              icon={<DollarIcon />}
              label="Monthly Drift Cost"
              value={<span className="text-warned">+€430<span className="text-lg text-warned/50">/mo</span></span>}
              tint="bg-warned/5"
            />
          </div>

          {/* Table / FinOps */}
          <div className="overflow-x-auto">
            {tab === "drifts" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/30 text-[10px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest font-mono">
                    <th className="px-5 py-3 font-medium">{t("landing.dashboardPreview.colResource")}</th>
                    <th className="px-4 py-3 font-medium">{t("landing.dashboardPreview.colDrift")}</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">{t("landing.dashboardPreview.colDetected")}</th>
                    <th className="px-4 py-3 font-medium text-right pr-6">{t("landing.dashboardPreview.colAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {DRIFTS.map((d, i) => (
                    <tr
                      key={i}
                      className="group border-b border-[color:var(--dg-border)] last:border-b-0 hover:bg-[color:var(--dg-surface-raised)] transition-colors"
                    >
                      {/* Resource */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${d.dot}`} />
                          <ServerIcon />
                          <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">
                            {d.resource}
                          </code>
                        </div>
                      </td>

                      {/* Change */}
                      <td className="px-4 py-4">
                        {d.change.from ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] line-through">
                              {d.change.from}
                            </span>
                            <span className="text-[color:var(--dg-fg-subtle)] text-[10px]">→</span>
                            <span className="rounded border border-warned/20 bg-warned/10 px-2 py-0.5 font-mono text-[10px] text-warned">
                              {d.change.to}
                            </span>
                          </div>
                        ) : (
                          <span className={`font-mono text-[11px] ${
                            d.severity === "critical" ? "text-blocked" : "text-[color:var(--dg-fg-muted)]"
                          }`}>
                            {d.change.text}
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
                          {d.detected}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]/60">
                          {d.age}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4 pr-6 text-right">
                        <button className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition opacity-0 group-hover:opacity-100 ${d.action.style}`}>
                          {d.action.label}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/30 text-[10px] text-[color:var(--dg-fg-subtle)] uppercase tracking-widest font-mono">
                    <th className="px-5 py-3 font-medium">{t("landing.dashboardPreview.colCategory")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("landing.dashboardPreview.colResources")}</th>
                    <th className="px-4 py-3 font-medium text-right pr-6">{t("landing.driftPreview.costImpact")}</th>
                  </tr>
                </thead>
                <tbody>
                  {FINOPS.map((f, i) => (
                    <tr key={i} className="border-b border-[color:var(--dg-border)] last:border-b-0 hover:bg-[color:var(--dg-surface-raised)] transition-colors">
                      <td className="px-5 py-4 text-[13px] text-[color:var(--dg-fg)]">{f.label}</td>
                      <td className="px-4 py-4 text-right font-mono text-[12px] text-[color:var(--dg-fg-subtle)]">{f.resources}</td>
                      <td className={`px-4 py-4 pr-6 text-right font-mono text-[12px] font-semibold ${f.color}`}>{f.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          Sample data. Your dashboard reflects real-time state from your AWS account.
        </p>
      </div>
    </section>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
        active
          ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] shadow-sm"
          : "text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
      }`}
    >
      {children}
    </button>
  );
}

function StatCell({ icon, label, value, tint = "" }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; tint?: string;
}) {
  return (
    <div className={`p-6 ${tint}`}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {label}
        </span>
      </div>
      <div className="font-sans text-3xl font-bold text-[color:var(--dg-fg)] tabular-nums">
        {value}
      </div>
    </div>
  );
}

function ServerIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-[color:var(--dg-fg-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v.75a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75v-.75m19.5 0a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v9a.75.75 0 00.75.75m18 0H3" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-4 w-4 text-[color:var(--dg-fg-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l4-4 4 4 4-6 4 3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4 text-blocked" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="h-4 w-4 text-warned" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
