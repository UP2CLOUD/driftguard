"use client";

import { useState } from "react";

const DRIFTS = [
  {
    resource: "aws_rds_cluster.prod-main",
    change: { from: "db.r5.large", to: "db.r5.xlarge" },
    type: "modified",
    severity: "warn",
    source: "ClickOps",
    age: "12m ago",
    cost: "+€180/mo",
  },
  {
    resource: "aws_s3_bucket.tf-state",
    change: { text: "Public access block removed" },
    type: "security",
    severity: "critical",
    source: "AWS Console",
    age: "1h ago",
    cost: "—",
  },
  {
    resource: "aws_security_group.app-web",
    change: { text: "Ingress 0.0.0.0/0 port 8080 added" },
    type: "security",
    severity: "high",
    source: "Terraform agent",
    age: "3h ago",
    cost: "—",
  },
  {
    resource: "aws_instance.worker-spot-03",
    change: { text: "Unmanaged instance — not in state" },
    type: "unmanaged",
    severity: "medium",
    source: "DriftGuard scan",
    age: "6h ago",
    cost: "+€89/mo",
  },
];

const FINOPS = [
  { label: "Untagged resources", count: 23, cost: "+€1,240/mo", severity: "high" },
  { label: "Right-sizing opportunities", count: 8, cost: "−€620/mo potential", severity: "ok" },
  { label: "Idle resources (>14d)", count: 5, cost: "+€310/mo waste", severity: "warn" },
  { label: "Drift-introduced spend", count: 3, cost: "+€269/mo", severity: "critical" },
];

const SEV_DOT: Record<string, string> = {
  critical: "bg-blocked shadow-[0_0_6px_rgba(255,71,87,0.6)]",
  high:     "bg-[color:var(--dg-severity-high)] shadow-[0_0_6px_rgba(255,136,0,0.5)]",
  warn:     "bg-warned shadow-[0_0_6px_rgba(255,176,32,0.5)]",
  medium:   "bg-warned",
  ok:       "bg-allowed",
};

const SEV_TEXT: Record<string, string> = {
  critical: "text-blocked",
  high:     "text-[color:var(--dg-severity-high)]",
  warn:     "text-warned",
  medium:   "text-warned",
  ok:       "text-allowed",
};

export function DashboardPreview() {
  const [tab, setTab] = useState<"drifts" | "finops">("drifts");

  return (
    <section className="py-20 sm:py-28 border-t border-[color:var(--dg-border)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <div className="dg-label mb-2">Live environment</div>
            <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
              Real-time cloud state intelligence
            </h2>
            <p className="mt-2 text-[13px] text-[color:var(--dg-fg-muted)]">
              Every unmanaged change. Every cost anomaly. Every security deviation.
            </p>
          </div>
          <div className="flex bg-[color:var(--dg-surface)] rounded-md border border-[color:var(--dg-border)] p-1 gap-1 self-start sm:self-auto">
            <TabBtn active={tab === "drifts"} onClick={() => setTab("drifts")}>
              Active drifts <span className="ml-1.5 rounded bg-blocked/20 px-1.5 font-mono text-[9px] text-blocked">4</span>
            </TabBtn>
            <TabBtn active={tab === "finops"} onClick={() => setTab("finops")}>
              FinOps impact
            </TabBtn>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-4">
          <Stat label="Unmanaged resources" value="12" />
          <Stat label="Security risks" value="2 critical" red />
          <Stat label="Monthly drift cost" value="+€430" amber />
          <Stat label="Last sync" value="8s ago" green />
        </div>

        {/* Table */}
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden bg-[color:var(--dg-surface)]">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            <span className="w-20">Severity</span>
            <span>Resource</span>
            <span>Change</span>
            <span className="hidden md:block">Source</span>
            <span>Action</span>
          </div>

          {tab === "drifts" && DRIFTS.map((d, i) => (
            <div
              key={i}
              className="group grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-3 sm:gap-4 items-center border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              {/* Severity */}
              <div className="flex items-center gap-2 w-20">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEV_DOT[d.severity]}`} />
                <span className={`font-mono text-[10px] uppercase tracking-widest ${SEV_TEXT[d.severity]}`}>
                  {d.severity}
                </span>
              </div>

              {/* Resource */}
              <code className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                {d.resource}
              </code>

              {/* Change */}
              <div className="flex items-center gap-2 min-w-0">
                {d.change.from ? (
                  <>
                    <span className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] line-through">
                      {d.change.from}
                    </span>
                    <span className="text-[color:var(--dg-fg-subtle)] text-[10px]">→</span>
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${SEV_TEXT[d.severity]} border-current/30 bg-current/5`}>
                      {d.change.to}
                    </span>
                  </>
                ) : (
                  <span className={`font-mono text-[11px] ${SEV_TEXT[d.severity]}`}>
                    {d.change.text}
                  </span>
                )}
              </div>

              {/* Source */}
              <span className="hidden md:block font-mono text-[10px] text-[color:var(--dg-fg-subtle)] whitespace-nowrap">
                {d.source} · {d.age}
              </span>

              {/* Action */}
              <div className="flex items-center gap-2">
                {d.cost !== "—" && (
                  <span className="font-mono text-[10px] text-warned hidden lg:inline">{d.cost}</span>
                )}
                <button
                  className={`rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition opacity-0 group-hover:opacity-100 ${
                    d.severity === "critical"
                      ? "border-blocked/40 bg-blocked/10 text-blocked hover:bg-blocked/20"
                      : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-canvas)]"
                  }`}
                >
                  {d.severity === "critical" ? "Auto-revert" : "Create PR"}
                </button>
              </div>
            </div>
          ))}

          {tab === "finops" && FINOPS.map((f, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEV_DOT[f.severity]}`} />
                <span className="text-[13px] text-[color:var(--dg-fg)]">{f.label}</span>
              </div>
              <span className={`font-mono text-[12px] font-semibold ${SEV_TEXT[f.severity]}`}>
                {f.cost}
              </span>
              <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                {f.count} resources
              </span>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-4 text-center font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          Sample data. Your dashboard shows real-time state from your AWS account.
        </p>
      </div>
    </section>
  );
}

function TabBtn({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-3 py-1.5 rounded font-mono text-[11px] uppercase tracking-wider transition ${
        active
          ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)] shadow-sm"
          : "text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, red, amber, green }: {
  label: string; value: string; red?: boolean; amber?: boolean; green?: boolean;
}) {
  const color = red ? "text-blocked" : amber ? "text-warned" : green ? "text-allowed" : "text-[color:var(--dg-fg)]";
  return (
    <div className="bg-[color:var(--dg-canvas)] px-4 py-4">
      <div className="dg-label mb-2">{label}</div>
      <div className={`font-mono text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
