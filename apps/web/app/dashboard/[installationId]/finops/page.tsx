import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import type { FinOpsDashboard } from "@/lib/api";
import { FinOpsListClient } from "./FinOpsListClient";

type Props = { params: Promise<{ installationId: string }> };

async function fetchFinOpsDashboard(installationId: string): Promise<FinOpsDashboard | null> {
  return beGet<FinOpsDashboard>(
    `/api/v1/finops/dashboard?installation_id=${installationId}`,
    { revalidate: 30, timeout: 8000 },
  );
}

function fmtCents(cents: number): string {
  const sign = cents > 0 ? "+" : cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default async function FinOpsPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const [data, messages] = await Promise.all([
    fetchFinOpsDashboard(installationId),
    getMessages(preferences.locale),
  ]);
  const t = createTranslator(messages);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 sm:px-6 py-6 sm:py-8">
      <div>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("finops.title") ?? "FinOps Review"}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("finops.subtitle") ?? "Cloud cost analysis for Terraform pull requests"}
        </p>
      </div>

      {!data || data.total_reviews === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("finops.noReviews") ?? "No FinOps reviews yet. Open a pull request with Terraform changes to get cost estimates."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("finops.totalDelta") ?? "Total Monthly Impact"}
              </p>
              <p className="mt-2 font-sans text-2xl font-bold text-[color:var(--dg-fg)]">
                {fmtCents(data.total_monthly_delta_cents)}
                <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">/mo</span>
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("finops.avgDelta") ?? "Avg Monthly Impact"}
              </p>
              <p className="mt-2 font-sans text-2xl font-bold text-[color:var(--dg-fg)]">
                {fmtCents(data.average_monthly_delta_cents)}
                <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">/mo</span>
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("finops.highestRisk") ?? "Highest Risk Score"}
              </p>
              <p className="mt-2 font-sans text-2xl font-bold text-[color:var(--dg-fg)]">
                {data.highest_risk_score}
                <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">/100</span>
              </p>
            </div>
          </div>

          {/* Provider breakdown */}
          {(data.provider_breakdown.aws > 0 ||
            data.provider_breakdown.gcp > 0 ||
            data.provider_breakdown.azure > 0) && (
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)]">
                {t("finops.providerBreakdown") ?? "Provider Breakdown"}
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                {[
                  { name: "AWS", cents: data.provider_breakdown.aws },
                  { name: "GCP", cents: data.provider_breakdown.gcp },
                  { name: "Azure", cents: data.provider_breakdown.azure },
                ].map(({ name, cents }) => (
                  <div key={name}>
                    <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                      {name}
                    </p>
                    <p className="mt-1 font-sans text-lg font-semibold text-[color:var(--dg-fg)]">
                      {fmtCents(cents)}/mo
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent reviews table */}
          <div>
            <h2 className="mb-3 font-sans font-semibold text-[13px] text-[color:var(--dg-fg)]">
              {t("finops.recentReviews")}
            </h2>
            <FinOpsListClient
              reviews={data.recent_reviews}
              locale={preferences.locale}
              labels={{
                filterPlaceholder: t("finops.filterPlaceholder"),
                riskAll:           t("finops.riskAll"),
                riskCritical:      t("finops.riskCritical"),
                riskHigh:          t("finops.riskHigh"),
                riskMedium:        t("finops.riskMedium"),
                riskLow:           t("finops.riskLow"),
                noMatch:           t("finops.noMatchFilter"),
              }}
            />
          </div>

          <p className="font-sans text-[11px] text-[color:var(--dg-fg-subtle)]">
            {t("finops.disclaimer") ?? "Costs are estimates based on published list prices. Actual cloud billing may vary."}
          </p>
        </>
      )}
    </div>
  );
}
