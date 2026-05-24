import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const API  = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HDRS = () => ({
  Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}`,
  "Content-Type": "application/json",
});

async function fetchAnalysis(id: string) {
  try {
    const r = await fetch(`${API()}/api/v1/scans/${id}`, {
      headers: HDRS(), next: { revalidate: 0 }, signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

const SEV_STYLE: Record<string, string> = {
  critical: "text-blocked   bg-blocked/10   border-blocked/30",
  high:     "text-[color:var(--dg-severity-high)] bg-[color:var(--dg-severity-high)]/10 border-[color:var(--dg-severity-high)]/30",
  medium:   "text-warned    bg-warned/10    border-warned/30",
  low:      "text-[color:var(--dg-fg-muted)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
  info:     "text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
};

const CAT_ICON: Record<string, string> = {
  iam: "⚿", network: "⬡", encryption: "🔒", storage: "◫", compute: "⬜",
  secrets: "★", kubernetes: "☸", github_actions: "⚡", best_practice: "◎", general: "◈",
};

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ installationId: string; analysisId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId, analysisId } = await params;
  const data = await fetchAnalysis(analysisId);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-20 text-center">
        <p className="font-mono text-[13px] text-[color:var(--dg-fg-muted)]">
          Analysis not found or API offline.
        </p>
        <Link href={`/dashboard/${installationId}`}
          className="mt-4 inline-block font-mono text-[11px] text-[color:var(--dg-electric)] hover:underline">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const findings: any[] = data.findings ?? [];
  const bySeverity = ["critical","high","medium","low","info"].map(s => ({
    s, count: findings.filter((f: any) => f.severity === s).length,
  })).filter(x => x.count > 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      {/* Back */}
      <Link href={`/dashboard/${installationId}`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition mb-8">
        ← Overview
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div>
          <div className="dg-label mb-1">Scan result</div>
          <h1 className="font-sans text-2xl font-semibold text-[color:var(--dg-fg)]">
            Analysis <span className="font-mono text-[color:var(--dg-fg-muted)] text-lg">{analysisId.slice(0,8)}</span>
          </h1>
        </div>
        {/* Risk badge */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="font-mono text-3xl font-bold" style={{
              color: data.risk_score >= 70 ? "var(--blocked)" : data.risk_score >= 40 ? "var(--warned)" : "var(--allowed)"
            }}>
              {data.risk_score}
            </div>
            <div className="dg-label mt-0.5">Risk score</div>
          </div>
          <div className={`px-3 py-1.5 rounded border font-mono text-[11px] uppercase tracking-widest ${
            data.status === "completed" ? "text-allowed border-allowed/30 bg-allowed/5" :
            data.status === "failed"    ? "text-blocked border-blocked/30 bg-blocked/5" :
            "text-warned border-warned/30 bg-warned/5"
          }`}>
            {data.status}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
        {[
          { label: "Files scanned", val: data.files_scanned },
          { label: "Total findings", val: findings.length },
          { label: "Critical + High", val: (data.critical ?? 0) + (data.high ?? 0) },
          { label: "Duration", val: data.duration_ms ? `${(data.duration_ms/1000).toFixed(1)}s` : "—" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
            <div className="dg-label mb-1">{label}</div>
            <div className="font-mono text-xl font-bold text-[color:var(--dg-fg)]">{val}</div>
          </div>
        ))}
      </div>

      {/* Severity breakdown */}
      {bySeverity.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {bySeverity.map(({ s, count }) => (
            <span key={s} className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${SEV_STYLE[s]}`}>
              {count} {s}
            </span>
          ))}
        </div>
      )}

      {/* Findings list */}
      {findings.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="text-2xl mb-3">✓</div>
          <p className="font-sans text-[14px] font-medium text-allowed mb-1">No findings</p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)]">
            {data.files_scanned === 0
              ? "No IaC files were found in this scan."
              : "All checks passed. No issues detected."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {findings.map((f: any, i: number) => (
            <div key={i} className="px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              {/* Top row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${SEV_STYLE[f.severity] ?? SEV_STYLE.info}`}>
                  {f.severity}
                </span>
                <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5">
                  {f.rule_id}
                </span>
                <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                  {CAT_ICON[f.category] ?? "◈"} {f.category}
                </span>
              </div>

              {/* Title */}
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)] mb-1">
                {f.title || f.message}
              </p>

              {/* File + line */}
              {f.file && (
                <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] mb-2">
                  📄 {f.file}{f.line ? `:${f.line}` : ""}
                  {f.resource && f.resource !== f.file && (
                    <span className="ml-2 text-[color:var(--dg-fg-muted)]">· {f.resource}</span>
                  )}
                </p>
              )}

              {/* Message (if different from title) */}
              {f.title && f.message !== f.title && (
                <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-2">{f.message}</p>
              )}

              {/* Suggestion */}
              {f.suggestion && (
                <div className="mt-2 rounded border border-allowed/20 bg-allowed/5 px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-allowed mr-2">Fix:</span>
                  <span className="font-mono text-[11px] text-allowed">{f.suggestion}</span>
                </div>
              )}

              {/* Controls */}
              {f.controls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.controls.map((ctrl: string) => (
                    <span key={ctrl} className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5">
                      {ctrl}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {data.errors?.length > 0 && (
        <div className="mt-6 rounded-md border border-warned/30 bg-warned/5 p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-warned mb-2">
            Scanner warnings
          </div>
          {data.errors.map((e: string, i: number) => (
            <p key={i} className="font-mono text-[11px] text-warned">{e}</p>
          ))}
        </div>
      )}
    </div>
  );
}
