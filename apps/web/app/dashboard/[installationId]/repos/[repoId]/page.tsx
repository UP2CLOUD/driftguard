import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { RepoAnalysesClient, type AnalysisRow } from "./RepoAnalysesClient";

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
