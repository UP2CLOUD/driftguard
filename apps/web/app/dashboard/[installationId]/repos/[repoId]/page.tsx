import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { RepoAnalysesClient, type AnalysisRow } from "./RepoAnalysesClient";

function riskDotFill(score: number): string {
  if (score >= 70) return "var(--dg-blocked, #ef4444)";
  if (score >= 40) return "var(--dg-warned, #f97316)";
  return "var(--dg-allowed, #22c55e)";
}

type TrendDir = "improving" | "worsening" | "stable";

function computeTrend(pts: { risk_score: number }[]): TrendDir {
  if (pts.length < 4) return "stable";
  const n = pts.length;
  const recentAvg = (pts[n - 1].risk_score + pts[n - 2].risk_score + pts[n - 3].risk_score) / 3;
  const olderAvg = (pts[0].risk_score + pts[1].risk_score + pts[2].risk_score) / 3;
  const delta = recentAvg - olderAvg;
  if (delta <= -5) return "improving";
  if (delta >= 5) return "worsening";
  return "stable";
}

const TREND_ARROW: Record<TrendDir, string> = { improving: "↘", worsening: "↗", stable: "→" };
const TREND_COLOR: Record<TrendDir, string> = {
  improving: "var(--dg-allowed, #22c55e)",
  worsening: "var(--dg-blocked, #ef4444)",
  stable: "var(--dg-fg-muted)",
};

function RepoRiskChart({
  pts,
  titleLabel,
  trendLabel,
  lastNLabel,
  trendDir,
}: {
  pts: { risk_score: number; created_at: string }[];
  titleLabel: string;
  trendLabel: string;
  lastNLabel: string;
  trendDir: TrendDir;
}) {
  const W = 600, H = 96, PAD_X = 8, PAD_Y = 8;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const n = pts.length;
  const toX = (i: number) => PAD_X + (i / (n - 1)) * innerW;
  const toY = (score: number) => PAD_Y + innerH * (1 - score / 100);

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.risk_score).toFixed(1)}`)
    .join(" ");
  const fillPath =
    linePath +
    ` L ${toX(n - 1).toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} L ${PAD_X} ${(PAD_Y + innerH).toFixed(1)} Z`;
  const lastScore = pts[n - 1].risk_score;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {titleLabel}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold" style={{ color: TREND_COLOR[trendDir] }}>
            {TREND_ARROW[trendDir]} {trendLabel}
          </span>
          <span className="font-sans text-[10px] text-[color:var(--dg-fg-subtle)]">{lastNLabel}</span>
          <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: riskDotFill(lastScore) }}>
            {lastScore}<span className="font-normal text-[color:var(--dg-fg-subtle)]">/100</span>
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 96 }} aria-hidden="true">
        <rect x={0} y={0} width={W} height={toY(70)} fill="var(--dg-blocked, #ef4444)" opacity={0.05} />
        <rect x={0} y={toY(70)} width={W} height={toY(40) - toY(70)} fill="var(--dg-warned, #f97316)" opacity={0.05} />
        <rect x={0} y={toY(40)} width={W} height={H - toY(40)} fill="var(--dg-allowed, #22c55e)" opacity={0.05} />
        <line x1={0} y1={toY(70)} x2={W} y2={toY(70)} stroke="var(--dg-border)" strokeWidth={0.75} strokeDasharray="4 3" />
        <line x1={0} y1={toY(40)} x2={W} y2={toY(40)} stroke="var(--dg-border)" strokeWidth={0.75} strokeDasharray="4 3" />
        <path d={fillPath} fill="var(--dg-electric, #6366f1)" opacity={0.06} />
        <path d={linePath} fill="none" stroke="var(--dg-electric, #6366f1)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.risk_score)} r={n > 12 ? 2 : 3} fill={riskDotFill(p.risk_score)}>
            <title>{p.risk_score}/100</title>
          </circle>
        ))}
        <text x={PAD_X} y={toY(70) - 2} fill="currentColor" fontSize={7} className="text-[color:var(--dg-fg-subtle)]" opacity={0.6}>70</text>
        <text x={PAD_X} y={toY(40) - 2} fill="currentColor" fontSize={7} className="text-[color:var(--dg-fg-subtle)]" opacity={0.6}>40</text>
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[9px] font-sans text-[color:var(--dg-fg-subtle)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-blocked, #ef4444)" }} />≥ 70
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-warned, #f97316)" }} />40–69
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-allowed, #22c55e)" }} />&lt; 40
        </span>
      </div>
    </div>
  );
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ installationId: string; repoId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId, repoId } = await params;
  const prefs = await getUserPreferences();
  const msgs = await getMessages(prefs.locale);
  const t = createTranslator(msgs);

  const org = await requireOrg(installationId);
  const [repo, analyses] = await Promise.all([
    beGet<any>(`/api/v1/orgs/${org.id}/repos`).then(
      (repos: any[]) => repos?.find((r: any) => r.id === repoId) ?? null
    ).catch(() => null),
    beGet<unknown[]>(`/api/v1/analyses?repo_id=${repoId}&limit=30`, { revalidate: 30 }).then((r) => r ?? []).catch(() => []),
  ]);

  const analysesList: AnalysisRow[] = (Array.isArray(analyses) ? analyses : []).map((a: any) => ({
    id: a.id ?? "",
    risk_score: a.risk_score ?? null,
    status: a.status ?? "",
    policy_verdict: a.policy_verdict ?? null,
    pr_number: a.pr_number ?? null,
    head_sha: a.head_sha ?? null,
    created_at: a.created_at ?? null,
  }));
  const critHigh = analysesList.filter((a) => (a.risk_score ?? 0) >= 70).length;
  const avgRisk = analysesList.length
    ? Math.round(analysesList.reduce((s, a) => s + (a.risk_score ?? 0), 0) / analysesList.length)
    : null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-subtle)]">
        <Link href={`/dashboard/${installationId}`} className="hover:text-[color:var(--dg-fg)] transition">
          {t("nav.overview")}
        </Link>
        <span className="opacity-40">·</span>
        <Link href={`/dashboard/${installationId}/repos`} className="hover:text-[color:var(--dg-fg)] transition">
          {t("repos.title") ?? "Repos"}
        </Link>
        <span className="opacity-40">·</span>
        <span className="text-[color:var(--dg-fg)]">{repo?.full_name ?? repoId}</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("dashboard.repository") ?? "Repository"}</div>
          <h1 className="font-mono text-xl font-semibold text-[color:var(--dg-fg)]">
            {repo?.full_name ?? repoId}
          </h1>
          {repo?.default_branch && (
            <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] mt-1">
              {t("repos.defaultBranch")} {repo.default_branch}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-sans font-medium text-[10px] text-allowed">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed" />
            {t("repos.connected")}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      {analysesList.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
          {[
            { label: t("repos.totalAnalyses"), value: analysesList.length },
            { label: t("dashboard.avgRisk"), value: avgRisk != null ? `${avgRisk}/100` : "—" },
            { label: t("repos.highRiskPrs"), value: critHigh },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">
                {label}
              </div>
              <div className="font-mono text-xl font-bold text-[color:var(--dg-fg)]">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk trend chart — only when ≥ 2 completed analyses with scores */}
      {(() => {
        const scored = analysesList
          .filter((a) => a.risk_score != null && a.created_at && a.status === "completed")
          .map((a) => ({ risk_score: a.risk_score as number, created_at: a.created_at as string, _time: new Date(a.created_at).getTime() }))
          .filter((a) => !isNaN(a._time))
          .sort((a, b) => a._time - b._time)
          .slice(-20);
        if (scored.length < 2) return null;
        const trendDir = computeTrend(scored);
        return (
          <RepoRiskChart
            pts={scored}
            trendDir={trendDir}
            titleLabel={t("dashboard.riskTrend.title")}
            trendLabel={t(`dashboard.riskTrend.${trendDir}`)}
            lastNLabel={t("dashboard.riskTrend.last30", { n: scored.length })}
          />
        );
      })()}

      {/* Analyses list */}
      <section>
        <h2 className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-3">
          {t("repos.recentAnalyses") ?? "Recent analyses"}
        </h2>

        {analysesList.length === 0 ? (
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
            <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
              {t("repos.noAnalyses")}
            </p>
            <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto leading-relaxed">
              {t("repos.noAnalysesTrigger")}
            </p>
          </div>
        ) : (
          <RepoAnalysesClient
            analyses={analysesList}
            installationId={installationId}
            labels={{
              riskAll:         t("repos.riskAll"),
              riskHigh:        t("repos.riskHigh"),
              riskMedium:      t("repos.riskMedium"),
              riskLow:         t("repos.riskLow"),
              statusAll:       t("repos.statusAll"),
              statusCompleted: t("repos.statusCompleted"),
              statusFailed:    t("repos.statusFailed"),
              noMatch:         t("repos.analysesNoMatch"),
              manualScan:      t("repos.manualScan"),
            }}
          />
        )}
      </section>
    </div>
  );
}
