import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

import { beGet } from "@/lib/backend";

async function fetchPolicies(id: string) {
  return (await beGet<unknown[]>(
    `/api/v1/policies?installation_id=${id}`,
    { revalidate: 30, timeout: 3000 },
  )) ?? [];
}

const TYPE_STYLE: Record<string, string> = {
  block: "text-blocked border-blocked/30 bg-blocked/5",
  warn:  "text-warned border-warned/30 bg-warned/5",
  alert: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
};

export default async function PoliciesPage({ params }: { params: Promise<{ installationId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const policies = await fetchPolicies(installationId);
  const active = policies.filter((p: any) => p.enabled).length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("policies.eyebrow")}</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("policies.title")}
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("policies.subtitle").replace("{active}", String(active)).replace("{total}", String(policies.length))}
          </p>
        </div>
        <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          {t("policies.apiHint")}
        </div>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">Policy engine ready</div>
          <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
            {t("policies.noTitle") ?? "No policies configured"}
          </p>
          <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-md mx-auto leading-relaxed">
            Policies let you block, warn, or approve infrastructure changes based on severity, resource patterns, and compliance requirements. Rules apply to every PR review automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
          {policies.map((p: any) => (
            <div key={p.id} className="flex items-start gap-4 px-4 py-4 hover:bg-[color:var(--dg-surface-raised)] transition">
              <div className="mt-0.5 shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full inline-block ${p.enabled ? "bg-allowed" : "bg-[color:var(--dg-fg-subtle)]"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${TYPE_STYLE[p.rule_type] ?? ""}`}>
                    {t(`policies.${p.rule_type}` as any) ?? p.rule_type}
                  </span>
                  <span className="text-[13px] font-medium text-[color:var(--dg-fg)]">{p.name}</span>
                  {!p.enabled && (
                    <span className="font-mono text-[9px] text-[color:var(--dg-fg-subtle)]">
                      {t("policies.disabled")}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{p.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-4 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                  {p.conditions && <span className="truncate">if {JSON.stringify(p.conditions)}</span>}
                  {p.match_count > 0 && (
                    <span className="text-warned shrink-0">
                      {t("policies.matches").replace("{n}", String(p.match_count))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
