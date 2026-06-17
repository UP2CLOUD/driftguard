import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import { checkInstallationAccess } from "@/lib/auth-utils";
import type { FinOpsReview, FinOpsResourceCostDetail } from "@/lib/api";

type Props = {
  params: Promise<{ installationId: string; reviewId: string }>;
};

function fmtCents(cents: number): string {
  const sign = cents >= 0 ? "+" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function fmtCentsAbs(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[level] ?? colors.LOW}`}>
      {level}
    </span>
  );
}

const CHANGE_BADGE: Record<string, string> = {
  add: "text-allowed border-allowed/30 bg-allowed/5",
  change: "text-warned border-warned/30 bg-warned/5",
  destroy: "text-blocked border-blocked/30 bg-blocked/5",
};

export default async function FinOpsReviewDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId, reviewId } = await params;

  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) redirect("/");

  const preferences = await getUserPreferences();
  const [review, messages] = await Promise.all([
    beGet<FinOpsReview>(`/api/v1/finops/reviews/${reviewId}`, { revalidate: 60, timeout: 10000 }),
    getMessages(preferences.locale),
  ]);

  if (!review) notFound();

  const t = createTranslator(messages);
  const resourceDetails: FinOpsResourceCostDetail[] = review.resource_cost_details ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 sm:px-6 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--dg-fg-subtle)]">
        <Link href={`/dashboard/${installationId}/finops`} className="hover:text-[color:var(--dg-fg)] transition">
          {t("finops.title") ?? "FinOps"}
        </Link>
        <span>/</span>
        <span className="font-mono">{review.repo_full_name}</span>
        {review.pr_number && <span className="font-mono">#{review.pr_number}</span>}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("finops.reviewDetail") ?? "Cost Review"}
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)] font-mono">
            {review.repo_full_name}
            {review.pr_number && <span className="text-[color:var(--dg-fg-subtle)]"> #{review.pr_number}</span>}
          </p>
        </div>
        <RiskBadge level={review.risk_level} />
      </div>

      {/* Cost summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("finops.currentMonthly") ?? "Current monthly", value: fmtCentsAbs(review.current_monthly_cents), sub: "/mo" },
          { label: t("finops.newMonthly") ?? "New monthly", value: fmtCentsAbs(review.new_monthly_cents), sub: "/mo" },
          {
            label: t("finops.monthlyDelta") ?? "Monthly delta",
            value: fmtCents(review.delta_monthly_cents),
            sub: "/mo",
            color: review.delta_monthly_cents > 0 ? "text-blocked" : review.delta_monthly_cents < 0 ? "text-allowed" : "",
          },
          {
            label: t("finops.annualDelta") ?? "Annual delta",
            value: fmtCents(review.delta_annual_cents),
            sub: "/yr",
            color: review.delta_annual_cents > 0 ? "text-blocked" : review.delta_annual_cents < 0 ? "text-allowed" : "",
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
            <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {label}
            </p>
            <p className={`mt-2 font-sans text-xl font-bold ${color ?? "text-[color:var(--dg-fg)]"}`}>
              {value}
              <span className="text-sm font-normal text-[color:var(--dg-fg-subtle)]">{sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Resource cost breakdown table */}
      {resourceDetails.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-5 py-3">
            <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)]">
              {t("finops.resourceBreakdown") ?? "Resource cost breakdown"}
            </h2>
          </div>
          <div className="divide-y divide-[color:var(--dg-border)]">
            {resourceDetails.map((rc, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-[color:var(--dg-surface-raised)] transition">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[9px] uppercase tracking-widest shrink-0 ${CHANGE_BADGE[rc.change_type] ?? "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]"}`}
                    >
                      {rc.change_type}
                    </span>
                    <span className="font-mono text-[12px] text-[color:var(--dg-fg)] truncate">{rc.resource_label}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                    <span>{rc.resource_type}</span>
                    {rc.file_path && <span className="truncate max-w-xs">{rc.file_path}</span>}
                  </div>
                </div>
                <span
                  className={`ml-4 shrink-0 font-mono text-[13px] font-semibold ${
                    rc.monthly_cents > 0 ? "text-blocked" : rc.monthly_cents < 0 ? "text-allowed" : "text-[color:var(--dg-fg-subtle)]"
                  }`}
                >
                  {fmtCents(rc.monthly_cents)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI summary */}
      {review.ai_summary && (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)] mb-3">
            {t("finops.aiSummary") ?? "AI cost analysis"}
          </h2>
          <p className="text-[13px] text-[color:var(--dg-fg-muted)] leading-relaxed whitespace-pre-line">
            {review.ai_summary}
          </p>
        </div>
      )}

      {/* Risk reasons */}
      {review.risk_reasons && review.risk_reasons.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)] mb-3">
            {t("finops.riskReasons") ?? "Risk factors"}
          </h2>
          <ul className="space-y-1.5">
            {review.risk_reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[color:var(--dg-fg-muted)]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {review.recommendations && review.recommendations.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-5 py-3">
            <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)]">
              {t("finops.recommendations") ?? "Recommendations"}
            </h2>
          </div>
          <div className="divide-y divide-[color:var(--dg-border)]">
            {review.recommendations.map((rec, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[9px] uppercase tracking-widest ${
                      rec.severity === "high" || rec.severity === "critical"
                        ? "text-blocked border-blocked/30 bg-blocked/5"
                        : rec.severity === "medium"
                        ? "text-warned border-warned/30 bg-warned/5"
                        : "text-allowed border-allowed/30 bg-allowed/5"
                    }`}
                  >
                    {rec.severity}
                  </span>
                  <span className="font-sans text-[13px] font-medium text-[color:var(--dg-fg)]">{rec.title}</span>
                </div>
                <p className="text-[12px] text-[color:var(--dg-fg-muted)] leading-relaxed">{rec.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terraform files */}
      {review.terraform_files && review.terraform_files.length > 0 && (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <h2 className="font-sans font-semibold text-[13px] text-[color:var(--dg-fg)] mb-3">
            {t("finops.terraformFiles") ?? "Terraform files analyzed"}
          </h2>
          <ul className="space-y-1">
            {review.terraform_files.map((f) => (
              <li key={f} className="font-mono text-[11px] text-[color:var(--dg-electric-bright)]">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-sans text-[11px] text-[color:var(--dg-fg-subtle)]">
        {t("finops.disclaimer") ?? "Costs are estimates based on published list prices. Actual cloud billing may vary."}
      </p>
    </div>
  );
}
