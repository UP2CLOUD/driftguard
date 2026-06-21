import Link from "next/link";
import { getOverview } from "./api";

type T = (key: string, vars?: Record<string, string | number>) => string | null | undefined;

type SeverityKey = "critical" | "high" | "medium" | "low";

const SEVERITY_CONFIG: Array<{ key: SeverityKey; i18nKey: string; fallback: string; color: string; riskBucket: string }> = [
  { key: "critical", i18nKey: "dashboard.sev.critical", fallback: "Critical", color: "var(--dg-blocked, #ef4444)", riskBucket: "high" },
  { key: "high",     i18nKey: "dashboard.sev.high",     fallback: "High",     color: "var(--dg-warned, #f97316)", riskBucket: "high" },
  { key: "medium",   i18nKey: "dashboard.sev.medium",   fallback: "Medium",   color: "#eab308",                   riskBucket: "medium" },
  { key: "low",      i18nKey: "dashboard.sev.low",      fallback: "Low",      color: "var(--dg-allowed, #22c55e)", riskBucket: "low" },
];

export async function SeverityBreakdownSection({
  installationId,
  t,
  demoOverview,
  analysesHref,
}: {
  installationId: string;
  t: T;
  demoOverview?: any;
  analysesHref?: string;
}) {
  const overview = demoOverview ?? await getOverview(installationId);
  const breakdown: Record<string, number> = overview?.severity_breakdown ?? {};
  const total = SEVERITY_CONFIG.reduce((s, { key }) => s + (Number(breakdown[key]) || 0), 0);

  if (total === 0) return null;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.sev.title") ?? "Findings by severity"}
        </span>
        <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
          {total} {t("dashboard.sev.total") ?? "total"}
        </span>
      </div>

      {/* Stacked bar — aria-hidden because the legend below is the accessible equivalent */}
      <div className="h-2 rounded-full overflow-hidden flex mb-3" aria-hidden="true">
        {SEVERITY_CONFIG.map(({ key, i18nKey, fallback, color }) => {
          const count = Number(breakdown[key]) || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          const label = t(i18nKey) ?? fallback;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend — each item links to analyses filtered by the corresponding risk bucket */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {SEVERITY_CONFIG.map(({ key, i18nKey, fallback, color, riskBucket }) => {
          const count = Number(breakdown[key]) || 0;
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          const label = t(i18nKey) ?? fallback;
          const href = analysesHref
            ? `${analysesHref}?risk=${riskBucket}`
            : `/dashboard/${installationId}/analyses?risk=${riskBucket}`;
          return (
            <Link
              key={key}
              href={href}
              title={`View ${label} analyses`}
              className="flex items-center gap-1.5 font-sans text-[11px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition-colors group cursor-pointer"
            >
              <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              {label}
              <span className="font-mono font-semibold text-[color:var(--dg-fg)]">{count}</span>
              <span className="text-[color:var(--dg-fg-subtle)]">({pct}%)</span>
              <svg className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
