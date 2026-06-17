import { getOverview } from "./api";

type T = (key: string, vars?: Record<string, string | number>) => string | null | undefined;

type SeverityKey = "critical" | "high" | "medium" | "low";

const SEVERITY_CONFIG: Array<{ key: SeverityKey; i18nKey: string; fallback: string; color: string }> = [
  { key: "critical", i18nKey: "dashboard.sev.critical", fallback: "Critical", color: "var(--dg-blocked, #ef4444)" },
  { key: "high",     i18nKey: "dashboard.sev.high",     fallback: "High",     color: "var(--dg-warned, #f97316)" },
  { key: "medium",   i18nKey: "dashboard.sev.medium",   fallback: "Medium",   color: "#eab308" },
  { key: "low",      i18nKey: "dashboard.sev.low",      fallback: "Low",      color: "var(--dg-allowed, #22c55e)" },
];

export async function SeverityBreakdownSection({
  installationId,
  t,
  demoOverview,
}: {
  installationId: string;
  t: T;
  demoOverview?: any;
}) {
  const overview = demoOverview ?? await getOverview(installationId);
  const breakdown: Record<string, number> = overview?.severity_breakdown ?? {};
  const total = SEVERITY_CONFIG.reduce((s, { key }) => s + (breakdown[key] ?? 0), 0);

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

      {/* Stacked bar */}
      <div className="h-2 rounded-full overflow-hidden flex mb-3">
        {SEVERITY_CONFIG.map(({ key, color }) => {
          const count = breakdown[key] ?? 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${key}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {SEVERITY_CONFIG.map(({ key, i18nKey, fallback, color }) => {
          const count = breakdown[key] ?? 0;
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <span key={key} className="flex items-center gap-1.5 font-sans text-[11px] text-[color:var(--dg-fg-muted)]">
              <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              {t(i18nKey) ?? fallback}
              <span className="font-mono font-semibold text-[color:var(--dg-fg)]">{count}</span>
              <span className="text-[color:var(--dg-fg-subtle)]">({pct}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
