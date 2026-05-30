import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";


export default async function RepoPage({
  params,
}: {
  params: Promise<{ installationId: string; repoId: string }>;
}) {
  const _prefs = await getUserPreferences();
  const _msgs  = await getMessages(_prefs.locale);
  const t      = createTranslator(_msgs);

  const session = await auth();
  if (!session) redirect("/");

  const { installationId, repoId } = await params;
  await requireOrg(installationId);

  const analyses = (await beGet<unknown[]>(`/api/v1/analyses?repo_id=${repoId}&limit=20`, { revalidate: 30 })) ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <Link
        href={`/dashboard/${installationId}`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition mb-6"
      >
        ← Repositories
      </Link>

      <div className="dg-label mb-2">{t("dashboard.repository")}</div>
      <h1 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-8">
        Analyses
      </h1>

      {analyses.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-10 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            No analyses yet. Open a Terraform PR to trigger the first review.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto] border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] gap-4">
            <span>Risk</span>
            <span>PR</span>
            <span className="hidden md:inline">SHA</span>
            <span>{t("dashboard.status")}</span>
          </div>
          {analyses.map((a: any) => (
            <Link
              key={a.id}
              href={`/dashboard/${installationId}/analyses/${a.id}`}
              className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3 bg-[color:var(--dg-surface)] hover:bg-[color:var(--dg-surface-raised)] transition"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                (a.risk_score ?? 0) > 70 ? "bg-blocked" :
                (a.risk_score ?? 0) > 40 ? "bg-warned" : "bg-allowed"
              }`} />
              <span className="font-mono text-[12px] text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition">
                PR #{a.pr_number ?? "—"}
              </span>
              <span className="hidden md:inline font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">
                {(a.head_sha ?? "").slice(0, 7) || "—"}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${
                a.status === "completed" ? "text-allowed" :
                a.status === "failed" ? "text-blocked" : "text-warned"
              }`}>
                {a.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
