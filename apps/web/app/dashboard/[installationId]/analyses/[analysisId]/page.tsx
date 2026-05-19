import Link from "next/link";
import { FindingsTable } from "@/components/FindingsTable";
import { ApiError, getAnalysis } from "@/lib/api";
import { requireOrg } from "@/lib/org-server";
import { notFound } from "next/navigation";
import { formatCostDeltaCentsForUser } from "@/lib/currency/format";
import { getUserPreferences } from "@/lib/preferences/server";

export default async function AnalysisDetail({
  params,
}: {
  params: Promise<{ installationId: string; analysisId: string }>;
}) {
  const { installationId, analysisId } = await params;
  const preferences = await getUserPreferences();
  await requireOrg(installationId);

  let a;
  try {
    a = await getAnalysis(analysisId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const costDelta = a.cost_delta_cents || 0;
  const costFormatted = await formatCostDeltaCentsForUser(
    a.cost_delta_cents,
    preferences.currency,
    preferences.locale
  );
  const riskScore = a.risk_score || 0;

  const riskColor =
    riskScore > 70 ? "var(--dg-blocked)" :
    riskScore > 40 ? "var(--dg-warned)" :
    "var(--dg-allowed)";

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 sm:py-10">
      {/* Back */}
      <Link
        href={`/dashboard/${installationId}`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
      >
        <span>←</span> back to workspace
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="dg-label">Analysis ▸ {a.id.slice(0, 8)}</div>
          <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {a.repo_full_name || "Pull request review"}
          </h1>
          <div className="mt-1 font-mono text-[12px] text-[color:var(--dg-fg-subtle)]">
            PR #{a.pr_number} ▪ {a.head_sha?.slice(0, 7)} ▪ {a.status}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest`}
            style={{ borderColor: riskColor, color: riskColor }}>
            <span className="h-1.5 w-1.5 rounded-full dg-pulse" style={{ background: riskColor, color: riskColor }} />
            risk {riskScore}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-8 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] grid-cols-2 sm:grid-cols-4">
        <StatCell
          label="Cost delta"
          value={costFormatted.display}
          accent={costDelta > 0 ? "warned" : costDelta < 0 ? "allowed" : undefined}
        />
        <StatCell
          label="Findings"
          value={a.findings.length}
        />
        <StatCell
          label="Critical / High"
          value={a.findings.filter((f: any) => f.severity === "critical" || f.severity === "high").length}
          accent={a.findings.some((f: any) => f.severity === "critical") ? "blocked" : undefined}
        />
        <StatCell
          label="Risk score"
          value={`${riskScore}`}
        />
      </div>

      {/* AI Summary */}
      {a.summary_md && (
        <section className="mt-10">
          <div className="dg-label mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--dg-electric)] dg-pulse text-[color:var(--dg-electric)]" />
            AI review summary
          </div>
          <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-5 sm:p-6">
            <div className="prose prose-invert prose-sm max-w-none font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)] whitespace-pre-wrap">
              {a.summary_md}
            </div>
          </div>
        </section>
      )}

      {/* Findings */}
      <section className="mt-10">
        <div className="dg-label mb-3">Findings</div>
        <FindingsTable findings={a.findings} />
      </section>

      {/* Metadata */}
      <section className="mt-10">
        <div className="dg-label mb-3">Metadata</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
          <Row k="Analysis ID" v={a.id} mono />
          <Row k="Status" v={a.status} />
          <Row k="Head SHA" v={a.head_sha || "—"} mono />
          {a.started_at && <Row k="Started" v={new Date(a.started_at).toLocaleString()} mono />}
          {a.finished_at && <Row k="Finished" v={new Date(a.finished_at).toLocaleString()} mono />}
        </div>
      </section>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: any; accent?: "allowed" | "warned" | "blocked" }) {
  const color =
    accent === "blocked" ? "text-blocked" :
    accent === "warned" ? "text-warned" :
    accent === "allowed" ? "text-allowed" :
    "text-[color:var(--dg-fg)]";
  return (
    <div className="bg-[color:var(--dg-canvas)] px-4 py-5">
      <div className="dg-label">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3 gap-4">
      <span className="text-[12px] text-[color:var(--dg-fg-muted)] shrink-0">{k}</span>
      <span className={`text-[12px] text-[color:var(--dg-fg)] truncate ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}
