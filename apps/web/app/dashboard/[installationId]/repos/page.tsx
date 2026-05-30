import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScanTrigger } from "@/components/dashboard/ScanTrigger";
import { UploadScan } from "@/components/dashboard/UploadScan";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";


import { beGet } from "@/lib/backend";

async function fetchOverview(installationId: string) {
  return beGet(`/api/v1/dashboard/overview?installation_id=${installationId}`, { revalidate: 10, timeout: 3000 });
}

async function fetchAnalyses(installationId: string) {
  const org = await beGet<{ id: string }>(`/api/v1/orgs/by-installation/${installationId}`, { revalidate: 10, timeout: 3000 });
  if (!org) return [];
  return (await beGet<unknown[]>(`/api/v1/orgs/${org.id}/analyses?limit=30`, { revalidate: 10, timeout: 3000 })) ?? [];
}

export default async function ReposPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const _prefs = await getUserPreferences();
  const _msgs  = await getMessages(_prefs.locale);
  const t      = createTranslator(_msgs);

  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const [overview, analyses] = await Promise.all([
    fetchOverview(installationId),
    fetchAnalyses(installationId),
  ]);

  const recentAnalyses: any[] = analyses?.slice(0, 20) ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("dashboard.scanner")}</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("dashboard.repos")}
          </h1>
        </div>
      </div>

      {/* Scan trigger panels */}
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        {/* GitHub repo scan */}
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-[color:var(--dg-fg-muted)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
              GitHub repository
            </span>
          </div>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] mb-4">
            Scan any public or connected GitHub repository by name.
          </p>
          <ScanTrigger installationId={installationId} />
        </div>

        {/* Upload scan */}
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-[color:var(--dg-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
              Upload files
            </span>
          </div>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] mb-4">
            Upload a <code className="font-mono text-[color:var(--dg-electric-bright)]">.tar.gz</code> of Terraform, Kubernetes, or GitHub Actions files.
          </p>
          <UploadScan installationId={installationId} />
        </div>
      </div>

      {/* Recent scans */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("dashboard.recentScans")}</h2>
        <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{recentAnalyses.length} total</span>
      </div>

      {recentAnalyses.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{t("dashboard.noScansYet")}</p>
          <p className="mt-1 text-[11px] text-[color:var(--dg-fg-subtle)]">
            {t("dashboard.noScansDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {recentAnalyses.map((a: any) => (
            <Link
              key={a.id || a.analysis_id}
              href={`/dashboard/${installationId}/analyses/${a.id || a.analysis_id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              {/* Risk badge */}
              <div
                className="w-10 h-10 rounded font-mono text-[13px] font-bold flex items-center justify-center shrink-0"
                style={{
                  background: (a.risk_score ?? 0) >= 70 ? "rgba(255,71,87,0.1)" : (a.risk_score ?? 0) >= 40 ? "rgba(255,176,32,0.1)" : "rgba(34,211,141,0.1)",
                  color: (a.risk_score ?? 0) >= 70 ? "var(--blocked)" : (a.risk_score ?? 0) >= 40 ? "var(--warned)" : "var(--allowed)",
                }}
              >
                {a.risk_score ?? "—"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                  {a.repo_full_name || a.source || "Scan " + (a.id || a.analysis_id)?.slice(0,8)}
                </p>
                <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                  {a.pr_number ? `PR #${a.pr_number}` : "manual"} · {a.head_sha?.slice(0,7) ?? ""}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${
                  a.status === "completed" ? "text-allowed border-allowed/30 bg-allowed/5" :
                  a.status === "failed"    ? "text-blocked border-blocked/30 bg-blocked/5" :
                  "text-warned border-warned/30 bg-warned/5"
                }`}>
                  {a.status}
                </span>
                <svg className="h-3 w-3 text-[color:var(--dg-fg-subtle)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
