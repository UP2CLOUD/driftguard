import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import type { FinOpsDashboard, FinOpsReview } from "@/lib/api";

type Props = { params: Promise<{ installationId: string }> };

async function fetchFinOpsDashboard(installationId: string): Promise<FinOpsDashboard | null> {
  return beGet<FinOpsDashboard>(
    `/api/v1/finops/dashboard?installation_id=${installationId}`,
    { revalidate: 30, timeout: 8000 },
  );
}

function fmtCents(cents: number): string {
  const sign = cents >= 0 ? "+" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[level] ?? colors.LOW}`}
    >
      {level}
    </span>
  );
}

export default async function FinOpsPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const [data, messages] = await Promise.all([
    fetchFinOpsDashboard(installationId),
    getMessages(),
  ]);
  const t = createTranslator(messages, "finops");

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 sm:px-6 py-6 sm:py-8">
      <div>
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("title") ?? "FinOps Review"}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("subtitle") ?? "Cloud cost analysis for Terraform pull requests"}
        </p>
      </div>

      {!data || data.total_reviews === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-14 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("noReviews") ?? "No FinOps reviews yet. Open a pull request with Terraform changes to get cost estimates."}
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("totalDelta") ?? "Total Monthly Impact"}
              </p>
              <p className="mt-2 font-sans text-2xl font-bold text-[color:var(--dg-fg)]">
                {fmtCents(data.total_monthly_delta_cents)}
                <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">/mo</span>
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("avgDelta") ?? "Avg Monthly Impact"}
              </p>
              <p className="mt-2 font-sans text-2xl font-bold text-[color:var(--dg-fg)]">
                {fmtCents(data.average_monthly_delta_cents)}
                <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">/mo</span>
              </p>
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
              <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("highestRisk") ?? "Highest Risk Score"}
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
                {t("providerBreakdown") ?? "Provider Breakdown"}
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
          <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-5 py-3">
              <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)]">
                {t("recentReviews") ?? "Recent Cost Reviews"}
              </h2>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {data.recent_reviews.map((review: FinOpsReview) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[color:var(--dg-surface-raised)] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">
                        {review.repo_full_name}
                      </span>
                      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                        #{review.pr_number}
                      </span>
                    </div>
                    {review.terraform_files.length > 0 && (
                      <p className="mt-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">
                        {review.terraform_files.slice(0, 2).join(", ")}
                        {review.terraform_files.length > 2 &&
                          ` +${review.terraform_files.length - 2} more`}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-4 shrink-0">
                    <RiskBadge level={review.risk_level} />
                    <span
                      className={`font-mono text-[12px] font-semibold ${
                        review.delta_monthly_cents > 0
                          ? "text-blocked"
                          : review.delta_monthly_cents < 0
                          ? "text-allowed"
                          : "text-[color:var(--dg-fg-subtle)]"
                      }`}
                    >
                      {fmtCents(review.delta_monthly_cents)}/mo
                    </span>
                    {review.created_at && (
                      <span className="hidden sm:block font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="font-sans text-[11px] text-[color:var(--dg-fg-subtle)]">
            {t("disclaimer") ?? "Costs are estimates based on published list prices. Actual cloud billing may vary."}
          </p>
        </>
      )}
    </div>
  );
}
