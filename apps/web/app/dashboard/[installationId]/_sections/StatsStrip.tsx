import Link from "next/link";
import { getOverview, getPlan } from "./api";

type T = (key: string) => string | null | undefined;

export async function StatsStripSection({
  installationId,
  t,
  demoOverview,
}: {
  installationId: string;
  t: T;
  demoOverview?: any;
}) {
  const [overview, plan] = await Promise.all([
    demoOverview ?? getOverview(installationId),
    demoOverview ? null : getPlan(installationId),
  ]);

  const repos = overview?.repos ?? 0;
  const analyses7d = overview?.analyses_7d ?? 0;
  const avgRisk = overview?.avg_risk_7d ?? null;
  const openInc = overview?.open_incidents ?? 0;
  const criticalInc = overview?.critical_incidents ?? 0;
  const memoryCount = overview?.memory_entries ?? 0;

  // Plan-aware usage cells
  const isPremium = plan?.is_premium ?? false;
  const activeRepos: number = plan?.repos?.active ?? repos;
  const repoLimit: number | null = plan?.repos?.limit ?? null;
  const prUsed: number | null = plan?.monthly_pr_reviews?.used ?? null;
  const prLimit: number | null = plan?.monthly_pr_reviews?.limit ?? null;
  const planName: string = plan?.plan ?? "free";

  const repoValue = repoLimit != null ? `${activeRepos}/${repoLimit}` : String(repos);
  const repoColor =
    repoLimit != null && activeRepos >= repoLimit ? "text-warned" : "";

  const cells = [
    {
      label: t("repos.statsRepos") ?? "Repos",
      value: repoValue,
      color: repoColor,
      hint: repos === 0 ? "Connect GitHub" : null,
    },
    {
      label: t("repos.statsAnalyses") ?? "Analyses 7d",
      value: analyses7d,
      color: "",
      hint: analyses7d === 0 ? (t("dashboard.statsHintOpenPr") ?? "Open a PR") : null,
    },
    {
      label: t("dashboard.avgRisk") ?? "Avg risk",
      value: avgRisk != null ? `${avgRisk}` : "—",
      color: avgRisk != null && avgRisk >= 70 ? "text-blocked" : avgRisk != null && avgRisk >= 40 ? "text-warned" : "",
      hint: avgRisk == null ? (t("dashboard.statsHintNoBaseline") ?? "No baseline") : null,
    },
    {
      label: t("dashboard.openIncidents") ?? "Open incidents",
      value: openInc,
      color: openInc > 0 ? "text-blocked" : "",
      hint: openInc === 0 ? (t("dashboard.statsHintNoneActive") ?? "None active") : null,
    },
    {
      label: t("dashboard.critical") ?? "Critical",
      value: criticalInc,
      color: criticalInc > 0 ? "text-blocked" : "",
      hint: criticalInc === 0 ? (t("dashboard.statsHintClean") ?? "Clean") : null,
    },
    {
      label: t("dashboard.memoryEntries") ?? "Memory",
      value: memoryCount,
      color: "",
      hint: memoryCount === 0 ? (t("dashboard.statsHintNoDecisionsYet") ?? "No decisions yet") : null,
    },
  ];

  // Append a PR reviews cell for premium orgs
  if (isPremium && prUsed != null && prLimit != null) {
    const pct = prUsed / prLimit;
    cells.push({
      label: "PR reviews",
      value: `${prUsed}/${prLimit}`,
      color: pct >= 1 ? "text-blocked" : pct >= 0.8 ? "text-warned" : "",
      hint: pct >= 1 ? "Limit reached" : pct >= 0.8 ? "Near limit" : null,
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
        {cells.map(({ label, value, color, hint }) => (
          <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">{label}</div>
            <div className={`font-mono text-xl font-bold tabular-nums ${color || "text-[color:var(--dg-fg)]"}`}>{value}</div>
            {hint && (
              <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5 truncate">{hint}</div>
            )}
          </div>
        ))}
      </div>

      {/* Free plan upgrade nudge when at repo limit */}
      {!isPremium && repoLimit != null && activeRepos >= repoLimit && (
        <div className="flex items-center justify-between px-4 py-2 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          <span>
            Free plan: {activeRepos}/{repoLimit} repos active.
            {" "}Disable one or upgrade to add more.
          </span>
          <Link
            href={`/dashboard/${installationId}/settings?intent=upgrade`}
            className="text-[color:var(--dg-fg)] underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* Premium near-limit warning */}
      {isPremium && prUsed != null && prLimit != null && prUsed / prLimit >= 0.8 && (
        <div className="flex items-center justify-between px-4 py-2 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          <span>
            {prUsed >= prLimit
              ? `Monthly PR review limit reached (${prUsed}/${prLimit}). Reviews resume next billing cycle.`
              : `${prLimit - prUsed} PR reviews remaining this month.`}
          </span>
          {prUsed >= prLimit && (
            <Link
              href={`/dashboard/${installationId}/settings`}
              className="text-[color:var(--dg-fg)] underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Manage plan
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
