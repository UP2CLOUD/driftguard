import { getOverview } from "./api";

type T = (key: string) => string | null | undefined;

export async function StatsStripSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const overview = await getOverview(installationId);

  const repos = overview?.repos ?? 0;
  const analyses7d = overview?.analyses_7d ?? 0;
  const avgRisk = overview?.avg_risk_7d ?? null;
  const openInc = overview?.open_incidents ?? 0;
  const criticalInc = overview?.critical_incidents ?? 0;
  const memoryCount = overview?.memory_entries ?? 0;

  const cells = [
    { label: t("repos.statsRepos") ?? "Repos", value: repos, color: "" },
    { label: t("repos.statsAnalyses") ?? "Analyses 7d", value: analyses7d, color: "" },
    { label: t("dashboard.avgRisk") ?? "Avg risk", value: avgRisk != null ? `${avgRisk}` : "—", color: "" },
    { label: t("dashboard.openIncidents") ?? "Open incidents", value: openInc, color: openInc > 0 ? "text-blocked" : "" },
    { label: t("dashboard.critical") ?? "Critical", value: criticalInc, color: criticalInc > 0 ? "text-blocked" : "" },
    { label: t("dashboard.memoryEntries") ?? "Memory", value: memoryCount, color: "" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
      {cells.map(({ label, value, color }) => (
        <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">{label}</div>
          <div className={`font-mono text-xl font-bold tabular-nums ${color || "text-[color:var(--dg-fg)]"}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
