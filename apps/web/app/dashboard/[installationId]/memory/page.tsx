import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

import { beGet } from "@/lib/backend";

async function fetchMemory(id: string) {
  const [entries, stats] = await Promise.all([
    beGet<any[]>(`/api/v1/memory?installation_id=${id}&limit=20`, { revalidate: 30, timeout: 3000 }),
    beGet<any>(`/api/v1/memory/stats?installation_id=${id}`, { revalidate: 30, timeout: 3000 }),
  ]);
  return {
    entries: entries ?? [],
    stats:   stats   ?? { total: 0, by_outcome: {}, by_severity: {} },
  };
}

const OUT_COLOR: Record<string, string> = {
  blocked:  "text-blocked",
  approved: "text-allowed",
  warned:   "text-warned",
};

export default async function MemoryPage({ params }: { params: Promise<{ installationId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const { entries, stats } = await fetchMemory(installationId);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="dg-label mb-2">{t("memory.eyebrow")}</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("memory.title")}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("memory.subtitle").replace("{total}", String(stats.total))}
        </p>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-6">
          <div className="bg-[color:var(--dg-canvas)] px-4 py-4">
            <div className="dg-label mb-1">{t("memory.total")}</div>
            <div className="font-mono text-2xl font-bold text-[color:var(--dg-fg)]">{stats.total}</div>
          </div>
          {Object.entries(stats.by_outcome as Record<string, number>).map(([k, v]) => (
            <div key={k} className="bg-[color:var(--dg-canvas)] px-4 py-4">
              <div className="dg-label mb-1">{t(`memory.${k}` as any) ?? k}</div>
              <div className={`font-mono text-2xl font-bold ${OUT_COLOR[k] ?? "text-[color:var(--dg-fg)]"}`}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">Memory engine ready</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("memory.noTitle") ?? "No memory decisions yet"}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-md mx-auto leading-relaxed">
            DriftGuard remembers accepted risks, suppressed findings, and repeated patterns — building institutional knowledge across all repositories. Every PR review contributes.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-start gap-4 px-4 py-3.5 hover:bg-[color:var(--dg-surface-raised)] transition">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <code className="font-mono text-[11px] text-[color:var(--dg-fg)]">
                    {e.repo_full_name}#{e.pr_number}
                  </code>
                  {e.outcome && (
                    <span className={`font-mono text-[10px] uppercase ${OUT_COLOR[e.outcome] ?? "text-[color:var(--dg-fg-subtle)]"}`}>
                      {t(`memory.${e.outcome}` as any) ?? e.outcome}
                    </span>
                  )}
                  {e.severity && (
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{e.severity}</span>
                  )}
                </div>
                {e.intent_text && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] truncate">{e.intent_text}</p>
                )}
                {e.created_at && (
                  <p className="mt-0.5 font-mono text-[9px] text-[color:var(--dg-fg-subtle)]">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
