import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { formatCostDeltaCentsForUser } from "@/lib/currency/format";
import { RescanButton } from "./RescanButton";
import { FindingsListClient, type FindingRow } from "./FindingsListClient";

async function fetchAnalysis(id: string) {
  return beGet<any>(`/api/v1/analyses/${id}`, { revalidate: 0, timeout: 15000 });
}

const SEV_STYLE: Record<string, string> = {
  critical: "text-blocked   bg-blocked/10   border-blocked/30",
  high:     "text-[color:var(--dg-severity-high)] bg-[color:var(--dg-severity-high)]/10 border-[color:var(--dg-severity-high)]/30",
  medium:   "text-warned    bg-warned/10    border-warned/30",
  low:      "text-[color:var(--dg-fg-muted)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
  info:     "text-[color:var(--dg-fg-subtle)] bg-[color:var(--dg-surface)] border-[color:var(--dg-border)]",
};


function AiMarkdown({ content }: { content: string }) {
  // Simple inline markdown: **bold**, `code`, ##/### heading, - list, > blockquote
  const lines = content.split("\n");
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return <h3 key={i} className="font-sans text-[12px] font-semibold text-[color:var(--dg-fg)] mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("## "))
          return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith("- [ ] "))
          return <li key={i} className="list-none flex gap-2"><span>☐</span>{line.slice(6)}</li>;
        if (line.startsWith("- "))
          return <li key={i} className="list-disc ml-4">{renderInline(line.slice(2))}</li>;
        if (line.startsWith("> "))
          return <blockquote key={i}>{line.slice(2)}</blockquote>;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ installationId: string; analysisId: string }>;
}) {
  const prefs = await getUserPreferences();
  const msgs  = await getMessages(prefs.locale);
  const t     = createTranslator(msgs);

  const session = await auth();
  if (!session) redirect("/");

  const { installationId, analysisId } = await params;
  const data = await fetchAnalysis(analysisId);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-20 text-center">
        <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {t("dashboard.analysisUnavailable")}
        </div>
        <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-1">
          {t("dashboard.analysisLoadFailed")}
        </p>
        <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-sm mx-auto mb-5">
          {t("dashboard.analysisLoadFailedDesc")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/dashboard/${installationId}`}
            className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
          >
            ← {t("dashboard.title")}
          </Link>
          <span className="text-[color:var(--dg-border)]">·</span>
          <Link
            href={`/dashboard/${installationId}/repos`}
            className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
          >
            {t("dashboard.viewRepos")}
          </Link>
        </div>
      </div>
    );
  }

  const rawFindings: any[] = Array.isArray(data.findings) ? data.findings : [];
  const bySeverity = ["critical","high","medium","low","info"].map(s => ({
    s, count: rawFindings.filter((f: any) => f.severity === s).length,
  })).filter(x => x.count > 0);

  const findingRows: FindingRow[] = rawFindings.map((f: any) => ({
    severity: f.severity ?? null,
    rule_id: f.rule_id ?? null,
    category: f.category ?? null,
    title: f.title ?? null,
    message: f.message ?? null,
    file: f.file ?? null,
    line: f.line ?? null,
    resource: f.resource ?? null,
    suggestion: f.suggestion ?? null,
    controls: Array.isArray(f.controls) ? f.controls : [],
  }));

  const costDeltaDisplay = data.cost_delta_cents != null
    ? await formatCostDeltaCentsForUser(data.cost_delta_cents, prefs.currency, prefs.locale)
    : null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      {/* Back */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/${installationId}/analyses`}
          className="inline-flex items-center gap-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition">
          ← {t("nav.analyses") ?? "Analyses"}
        </Link>
        <span className="text-[color:var(--dg-border)]">·</span>
        <Link href={`/dashboard/${installationId}`}
          className="inline-flex items-center gap-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition">
          {t("nav.overview")}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div>
          <div className="dg-label mb-1">{t("dashboard.scanResult")}</div>
          <h1 className="font-sans text-2xl font-semibold text-[color:var(--dg-fg)]">
            {data.repo_full_name
              ? <>
                  <span className="text-[color:var(--dg-fg-muted)]">{data.repo_full_name}</span>
                  {data.pr_number
                    ? <a
                        href={`https://github.com/${data.repo_full_name}/pull/${data.pr_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-lg text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition ml-1"
                        title={t("common.viewPrOnGitHub") ?? "View PR on GitHub"}
                      >#{data.pr_number} ↗</a>
                    : null}
                </>
              : <>{t("dashboard.scanResult")} <span className="font-mono text-[color:var(--dg-fg-muted)] text-lg">{analysisId.slice(0,8)}</span></>
            }
          </h1>
          {data.head_sha && (
            <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] mt-1">
              sha <code>{data.head_sha.slice(0,7)}</code>
            </p>
          )}
        </div>
        {/* Risk badge + actions */}
        <div className="flex items-center gap-3">
          {data.repo_full_name && (
            <RescanButton
              installationId={installationId}
              repoFullName={data.repo_full_name}
              headSha={data.head_sha}
              labels={{
                queuing:  t("analyses.queuing")  ?? "queuing…",
                scanning: t("analyses.scanning") ?? "scanning…",
                error:    t("analyses.scanError") ?? "failed — try again",
                rescan:   t("analyses.rescan")   ?? "↺ Re-run scan",
              }}
            />
          )}
          <div className="text-center">
            <div className={`font-mono text-3xl font-bold tabular-nums ${
              data.risk_score == null ? "text-[color:var(--dg-fg-muted)]" :
              data.risk_score >= 70  ? "text-blocked" :
              data.risk_score >= 40  ? "text-warned"  : "text-allowed"
            }`}>
              {data.risk_score ?? "—"}
            </div>
            <div className="dg-label mt-0.5">{t("dashboard.riskScore")}</div>
          </div>
          <div className={`px-3 py-1.5 rounded border font-sans font-semibold text-[11px] uppercase tracking-wide ${
            data.status === "completed" ? "text-allowed border-allowed/30 bg-allowed/5" :
            data.status === "failed"    ? "text-blocked border-blocked/30 bg-blocked/5" :
            "text-warned border-warned/30 bg-warned/5"
          }`}>
            {data.status}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className={`mb-8 grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] grid-cols-2 ${costDeltaDisplay ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        {[
          { label: t("dashboard.filesScanned"),  val: data.files_scanned },
          { label: t("dashboard.totalFindings"), val: findings.length },
          { label: t("dashboard.criticalHigh"),  val: (data.critical ?? 0) + (data.high ?? 0) },
          { label: t("dashboard.duration"),      val: data.duration_ms ? `${(data.duration_ms/1000).toFixed(1)}s` : "—" },
          ...(costDeltaDisplay ? [{ label: t("dashboard.costDelta") ?? "Cost delta", val: costDeltaDisplay, cost: data.cost_delta_cents as number }] : []),
        ].map(({ label, val, ...rest }) => {
          const costCents = (rest as any).cost;
          const costColor = costCents == null ? "" : costCents > 0 ? "text-blocked" : costCents < 0 ? "text-allowed" : "";
          return (
            <div key={label} className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="dg-label mb-1">{label}</div>
              <div className={`font-mono text-xl font-bold ${costColor || "text-[color:var(--dg-fg)]"}`}>{val}</div>
            </div>
          );
        })}
      </div>

      {/* Severity breakdown + policy verdict */}
      {(bySeverity.length > 0 || data.policy_verdict) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {bySeverity.map(({ s, count }) => (
            <span key={s} className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest ${SEV_STYLE[s]}`}>
              {count} {s}
            </span>
          ))}
          {data.policy_verdict && (
            <span className={`rounded border px-2.5 py-1 font-sans font-medium text-[10px] uppercase tracking-widest ${
              data.policy_verdict === "block" ? "text-blocked border-blocked/30 bg-blocked/10" :
              data.policy_verdict === "warn"  ? "text-warned border-warned/30 bg-warned/10" :
              "text-allowed border-allowed/30 bg-allowed/10"
            }`}>
              policy: {data.policy_verdict}
            </span>
          )}
        </div>
      )}


      {/* AI Review — shown when available */}
      {data.ai_summary && (
        <div className="mb-6 rounded-md border border-[color:var(--dg-electric)]/20 bg-[color:var(--dg-electric)]/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
              ⬡ {t("dashboard.aiReview")}
            </span>
            <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">{t("dashboard.aiReviewDesc")}</span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none
            [&_h2]:font-sans [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-[color:var(--dg-fg)] [&_h2]:mt-4 [&_h2]:mb-2
            [&_p]:text-[12px] [&_p]:text-[color:var(--dg-fg-muted)] [&_p]:leading-relaxed
            [&_li]:text-[12px] [&_li]:text-[color:var(--dg-fg-muted)]
            [&_strong]:text-[color:var(--dg-fg)] [&_code]:text-[color:var(--dg-electric-bright)]
            [&_code]:bg-[color:var(--dg-surface)] [&_code]:px-1 [&_code]:rounded
            [&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--dg-electric)]/30
            [&_blockquote]:pl-3 [&_blockquote]:text-[color:var(--dg-fg-muted)]">
            <AiMarkdown content={data.ai_summary} />
          </div>
        </div>
      )}

      {/* Findings list */}
      {rawFindings.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="text-2xl mb-3">✓</div>
          <p className="font-sans text-[14px] font-medium text-allowed mb-1">{t("dashboard.noFindings")}</p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)]">
            {data.files_scanned === 0
              ? t("dashboard.noFindingsEmpty")
              : t("dashboard.noFindingsDesc")}
          </p>
        </div>
      ) : (
        <FindingsListClient
          findings={findingRows}
          labels={{
            sevAll:           t("analyses.findingsSevAll"),
            sevCritical:      t("analyses.findingsSevCritical"),
            sevHigh:          t("analyses.findingsSevHigh"),
            sevMedium:        t("analyses.findingsSevMedium"),
            sevLow:           t("analyses.findingsSevLow"),
            sevInfo:          t("analyses.findingsSevInfo"),
            searchPlaceholder: t("analyses.findingsSearchPlaceholder"),
            noMatch:          t("analyses.findingsNoMatch"),
            suggestedFix:     t("incidents.suggestedFix"),
            showing:          t("analyses.findingsShowing"),
            of:               t("analyses.findingsOf"),
            findingsLabel:    t("analyses.findingsLabel"),
          }}
        />
      )}

      {/* Errors */}
      {data.errors?.length > 0 && (
        <div className="mt-6 rounded-md border border-warned/30 bg-warned/5 p-4">
          <div className="font-sans font-medium text-[10px] uppercase tracking-widest text-warned mb-2">
            {t("dashboard.scannerWarnings")}
          </div>
          {data.errors.map((e: string, i: number) => (
            <p key={i} className="font-mono text-[11px] text-warned">{e}</p>
          ))}
        </div>
      )}
    </div>
  );
}
