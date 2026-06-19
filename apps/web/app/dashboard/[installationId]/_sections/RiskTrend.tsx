import { getOrgAnalyses } from "./api";

type TranslateFn = (key: string) => string | null | undefined;

type DataPoint = { risk_score: number; created_at: string; repo_full_name?: string | null };

function riskDotFill(score: number): string {
  if (score >= 70) return "var(--dg-blocked, #ef4444)";
  if (score >= 40) return "var(--dg-warned, #f97316)";
  return "var(--dg-allowed, #22c55e)";
}

function computeTrend(pts: DataPoint[]): "improving" | "worsening" | "stable" {
  if (pts.length < 4) return "stable";
  const n = pts.length;
  const recentAvg = (pts[n - 1].risk_score + pts[n - 2].risk_score + pts[n - 3].risk_score) / 3;
  const olderAvg = (pts[0].risk_score + pts[1].risk_score + pts[2].risk_score) / 3;
  const delta = recentAvg - olderAvg;
  if (delta <= -5) return "improving";
  if (delta >= 5) return "worsening";
  return "stable";
}

const TREND_ARROW: Record<string, string> = {
  improving: "↘",
  worsening: "↗",
  stable: "→",
};

const TREND_COLOR: Record<string, string> = {
  improving: "var(--dg-allowed, #22c55e)",
  worsening: "var(--dg-blocked, #ef4444)",
  stable: "var(--dg-fg-muted)",
};

export async function RiskTrendSection({
  installationId,
  t,
  demoOverview,
}: {
  installationId: string;
  t: TranslateFn;
  demoOverview?: { recent_analyses?: DataPoint[] };
}) {
  let raw: DataPoint[] = [];
  try {
    if (demoOverview) {
      raw = demoOverview.recent_analyses ?? [];
    } else {
      raw = (await getOrgAnalyses(installationId, 30)) as DataPoint[];
    }
  } catch (error) {
    console.error("Failed to fetch organization analyses for RiskTrend:", error);
    return null;
  }

  const pts = raw
    .filter((a) => a.risk_score != null && a.created_at)
    .map((a) => ({ ...a, time: new Date(a.created_at).getTime() }))
    .filter((a) => !isNaN(a.time))
    .sort((a, b) => a.time - b.time)
    .slice(-20);

  if (pts.length < 2) return null;

  const W = 600;
  const H = 96;
  const PAD_X = 8;
  const PAD_Y = 8;
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

  const trend = computeTrend(pts);
  const lastScore = pts[n - 1].risk_score;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.riskTrend.title") ?? "Risk trend"}
        </span>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[11px] font-semibold"
            style={{ color: TREND_COLOR[trend] }}
          >
            {TREND_ARROW[trend]}{" "}
            {t(`dashboard.riskTrend.${trend}`) ?? trend}
          </span>
          <span className="font-sans text-[10px] text-[color:var(--dg-fg-subtle)]">
            {(t("dashboard.riskTrend.last30") ?? "Last {n} analyses").replace("{n}", String(n))}
          </span>
          <span
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color: riskDotFill(lastScore) }}
          >
            {lastScore}
            <span className="font-normal text-[color:var(--dg-fg-subtle)]">/100</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ maxHeight: 96 }}
        aria-hidden="true"
      >
        {/* Risk band backgrounds — extend to full SVG edges to avoid gaps */}
        <rect
          x={0} y={0} width={W}
          height={toY(70)}
          fill="var(--dg-blocked, #ef4444)" opacity={0.05}
        />
        <rect
          x={0} y={toY(70)} width={W}
          height={toY(40) - toY(70)}
          fill="var(--dg-warned, #f97316)" opacity={0.05}
        />
        <rect
          x={0} y={toY(40)} width={W}
          height={H - toY(40)}
          fill="var(--dg-allowed, #22c55e)" opacity={0.05}
        />

        {/* Threshold lines */}
        <line
          x1={0} y1={toY(70)} x2={W} y2={toY(70)}
          stroke="var(--dg-border)" strokeWidth={0.75} strokeDasharray="4 3"
        />
        <line
          x1={0} y1={toY(40)} x2={W} y2={toY(40)}
          stroke="var(--dg-border)" strokeWidth={0.75} strokeDasharray="4 3"
        />

        {/* Area fill under the line */}
        <path
          d={fillPath}
          fill="var(--dg-electric, #6366f1)"
          opacity={0.06}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--dg-electric, #6366f1)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(p.risk_score)}
            r={n > 12 ? 2 : 3}
            fill={riskDotFill(p.risk_score)}
          >
            <title>
              {p.repo_full_name ?? "—"} — {p.risk_score}/100
            </title>
          </circle>
        ))}

        {/* Y-axis labels */}
        <text x={PAD_X} y={toY(70) - 2} fill="currentColor" fontSize={7} className="text-[color:var(--dg-fg-subtle)]" opacity={0.6}>70</text>
        <text x={PAD_X} y={toY(40) - 2} fill="currentColor" fontSize={7} className="text-[color:var(--dg-fg-subtle)]" opacity={0.6}>40</text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[9px] font-sans text-[color:var(--dg-fg-subtle)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-blocked, #ef4444)" }} />
          ≥ 70
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-warned, #f97316)" }} />
          40–69
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--dg-allowed, #22c55e)" }} />
          &lt; 40
        </span>
      </div>
    </div>
  );
}
