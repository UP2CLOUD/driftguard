import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import Link from "next/link";
import { BillingActions } from "@/components/BillingActions";
import { UserPreferencesSettings } from "@/components/UserPreferencesSettings";
import { AwsIntegrationForm } from "@/components/AwsIntegrationForm";
import { NotificationEmailForm } from "@/components/NotificationEmailForm";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import type { Org } from "@/lib/api";
import { localizedPageMeta } from "@/lib/seo";
import { beGet } from "@/lib/backend";

type PlanData = {
  plan: string;
  subscription_status: string;
  is_premium: boolean;
  repos: { active: number; limit: number | null };
  monthly_pr_reviews: { used: number | null; limit: number | null };
};


export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/dashboard",
    locale,
    title:       t("settings.meta.title"),
    description: t("settings.meta.description"),
  });
}

export default async function Settings({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  let org: Org | null = null;
  let planData: PlanData | null = null;
  try {
    org = await requireOrg(installationId);
    planData = await beGet<PlanData>(
      `/api/v1/billing/plan?installation_id=${installationId}`,
      { revalidate: 30 }
    );
  } catch {
    /* API offline — still render preferences */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-14">
      {/* Page header */}
      <div>
        <div className="dg-label">{t("settings.workspaceTitle")} ▸ {installationId}</div>
        <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("settings.title")}
        </h1>
      </div>

      {/* API offline warning */}
      {!org && (
        <div className="flex items-start gap-3 rounded-md border border-warned/30 bg-warned/5 px-4 py-3">
          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
          <p className="font-mono text-[11px] text-warned">
            {t("settings.apiOfflineWarning")}
            {" "}Install from{" "}
            <span className="opacity-70">{process.env.NEXT_PUBLIC_API_URL ?? "not set"}</span>
          </p>
        </div>
      )}

      {/* ── GitHub Integration ──────────────────────────────────── */}
      <Section title={t("settings.githubIntegration")} description={t("settings.githubIntegrationDesc")}>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{t("dashboard.status")}</span>
            <span className={`flex items-center gap-1.5 font-mono text-[10px] ${org ? "text-allowed" : "text-warned"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${org ? "bg-allowed" : "bg-warned"}`} />
              {org ? t("settings.connected") : t("settings.notConnected")}
            </span>
          </div>
          <Row label={t("settings.githubApp")} value={process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews"} mono />
          <Row label={t("settings.githubInstallationRow")} value={installationId} mono />
          <Row
            label={t("settings.webhookUrl")}
            value={
              process.env.NEXT_PUBLIC_API_URL
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/webhooks/github`
                : "— set NEXT_PUBLIC_API_URL —"
            }
            mono
          />
          <Row label={t("settings.webhookEvents")} value="pull_request · installation · installation_repositories" mono />
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{t("settings.manageInstallation")}</span>
            <a
              href={`https://github.com/organizations/settings/installations/${installationId}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
            >
              {t("settings.githubSettingsLink")}
            </a>
          </div>
        </div>
      </Section>

      {/* ── Preferences ─────────────────────────────────────────── */}
      <Section title={t("settings.preferences")} description={t("settings.preferencesDesc")}>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <UserPreferencesSettings initialPreferences={preferences} />
        </div>
      </Section>

      {/* ── API tokens ──────────────────────────────────────────── */}
      <Section title={t("tokens.title")} description={t("tokens.settingsDesc")}>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5 flex items-center justify-between gap-4">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("tokens.settingsHint")}
          </p>
          <Link
            href={`/dashboard/${installationId}/settings/tokens`}
            className="dg-button dg-button-ghost text-[12px] shrink-0"
          >
            {t("tokens.manage")} →
          </Link>
        </div>
      </Section>

      {/* ── AWS Integration ─────────────────────────────────────── */}
      <Section
        title={t("dashboard.awsIntegration")}
        description={t("settings.awsDesc")}
      >
        <AwsIntegrationForm installationId={installationId} org={org} />
      </Section>

      {/* ── Notifications ───────────────────────────────────────── */}
      {org && (
        <Section title={t("settings.notifications") ?? "Notifications"} description={t("settings.notificationsDesc") ?? "Get an email alert when a PR scan finds critical issues."}>
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
            <NotificationEmailForm
              orgId={org.id}
              installationId={installationId}
              initialEmail={org.contact_email}
              labels={{
                placeholder: t("settings.notifEmailPlaceholder") ?? "team@yourcompany.com",
                save:        t("settings.notifSave")             ?? "Save",
                saving:      t("settings.notifSaving")           ?? "saving…",
                saved:       t("settings.notifSaved")            ?? "Saved.",
                alertDesc:   t("settings.notifAlertDesc")        ?? "DriftGuard sends an alert when a PR scan scores ≥ 60 risk or a policy block rule fires. Leave blank to disable.",
                sendTest:    t("settings.notifSendTest")         ?? "Send test email",
                sending:     t("settings.notifSending")          ?? "sending…",
                testSent:    t("settings.notifTestSent")         ?? "Test sent to {email}",
              }}
            />
          </div>
        </Section>
      )}

      {/* ── Billing ─────────────────────────────────────────────── */}
      {org && (
        <Section title={t("settings.billingTitle")} description={t("settings.billingDesc")}>
          <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] sm:grid-cols-3 mb-4">
            <PlanCard
              name={t("settings.planFree") ?? "Free"}
              price="€0"
              detail={
                planData && !planData.is_premium
                  ? (t("settings.planFreeUsage") ?? "{active}/{limit} repos active")
                      .replace("{active}", String(planData.repos.active))
                      .replace("{limit}", String(planData.repos.limit ?? 3))
                  : (t("settings.planFreeDetail") ?? "Up to 3 repos · unlimited PR reviews")
              }
              current={org.plan === "free" || (!planData?.is_premium && org.plan !== "team" && org.plan !== "enterprise")}
              activeLabel={t("settings.active")}
            />
            <PlanCard
              name={t("settings.planTeam") ?? "Team"}
              price="€29"
              period="/repo/mo"
              detail={
                planData?.is_premium
                  ? (t("settings.planTeamUsage") ?? "{used}/{limit} PR reviews this month")
                      .replace("{used}", String(planData.monthly_pr_reviews.used ?? 0))
                      .replace("{limit}", String(planData.monthly_pr_reviews.limit ?? 50))
                  : (t("settings.planTeamDetail") ?? "50 PR reviews/mo · memory · compliance")
              }
              current={org.plan === "team"}
              activeLabel={t("settings.active")}
              highlighted
            />
            <PlanCard
              name={t("settings.planEnterprise") ?? "Enterprise"}
              price="—"
              detail={t("settings.planEnterpriseDetail") ?? "Self-hosted · SSO · SLA · custom policy"}
              current={org.plan === "enterprise"}
              activeLabel={t("settings.active")}
            />
          </div>

          {/* Quota bar for free plan */}
          {planData && !planData.is_premium && planData.repos.limit != null && (
            <div className="mb-4 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                  {t("settings.activeRepositories") ?? "Active repositories"}
                </span>
                <span className={`font-mono text-[11px] font-semibold ${planData.repos.active >= planData.repos.limit ? "text-warned" : "text-[color:var(--dg-fg)]"}`}>
                  {planData.repos.active} / {planData.repos.limit}
                </span>
              </div>
              <div className="h-1 rounded-full bg-[color:var(--dg-border)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${planData.repos.active >= planData.repos.limit ? "bg-warned" : "bg-[color:var(--dg-electric)]"}`}
                  style={{ width: `${Math.min(100, (planData.repos.active / planData.repos.limit) * 100)}%` }}
                />
              </div>
              {planData.repos.active >= planData.repos.limit && (
                <p className="mt-2 font-mono text-[10px] text-warned">
                  {t("settings.atRepoLimit") ?? "At repo limit. Disable a repository or upgrade to add more."}
                </p>
              )}
            </div>
          )}

          {/* Quota bar for premium plan */}
          {planData?.is_premium && planData.monthly_pr_reviews.limit != null && planData.monthly_pr_reviews.used != null && (
            <div className="mb-4 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                  {t("settings.prReviewsThisMonth") ?? "PR reviews this month"}
                </span>
                <span className={`font-mono text-[11px] font-semibold ${planData.monthly_pr_reviews.used >= planData.monthly_pr_reviews.limit ? "text-blocked" : planData.monthly_pr_reviews.used / planData.monthly_pr_reviews.limit >= 0.8 ? "text-warned" : "text-[color:var(--dg-fg)]"}`}>
                  {planData.monthly_pr_reviews.used} / {planData.monthly_pr_reviews.limit}
                </span>
              </div>
              <div className="h-1 rounded-full bg-[color:var(--dg-border)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${planData.monthly_pr_reviews.used >= planData.monthly_pr_reviews.limit ? "bg-blocked" : planData.monthly_pr_reviews.used / planData.monthly_pr_reviews.limit >= 0.8 ? "bg-warned" : "bg-[color:var(--dg-electric)]"}`}
                  style={{ width: `${Math.min(100, (planData.monthly_pr_reviews.used / planData.monthly_pr_reviews.limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <BillingActions
            orgId={org.id}
            installationId={installationId}
            hasCustomer={!!org.has_stripe_customer}
            plan={org.plan}
          />
        </Section>
      )}

      {/* ── Workspace info ───────────────────────────────────────── */}
      <Section title={t("settings.workspaceTitle")} description={t("settings.workspaceDesc")}>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
          <Row label={t("settings.installationId")} value={installationId} mono />
          {org && (
            <>
              <Row label={t("settings.organisationId")} value={org.id} mono />
              <Row label={t("settings.plan")} value={org.plan} />
              <Row label={t("settings.stripeCustomer")} value={org.has_stripe_customer ? t("settings.stripeActive") : "—"} />
            </>
          )}
        </div>
      </Section>

      {/* ── Danger zone ─────────────────────────────────────────── */}
      <Section title={t("settings.dangerZone")} description={t("settings.dangerZoneDesc")} danger>
        <div className="rounded-md border border-blocked/30 bg-blocked/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-semibold text-[color:var(--dg-fg)]">{t("dashboard.removeDriftGuard")}</div>
            <p className="mt-1 text-[12px] text-[color:var(--dg-fg-muted)]">
              {t("settings.uninstallDesc")}
            </p>
          </div>
          <a
            href={`https://github.com/settings/installations/${installationId}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded border border-blocked/40 bg-blocked/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-blocked hover:bg-blocked/20 transition"
          >
            {t("settings.uninstallButton")}
          </a>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  danger,
  children,
}: {
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2
          className={`font-sans text-[15px] font-semibold tracking-tight ${
            danger ? "text-blocked" : "text-[color:var(--dg-fg)]"
          }`}
        >
          {title}
        </h2>
        <p className="mt-1 text-[12px] text-[color:var(--dg-fg-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3 gap-4">
      <span className="text-[12px] text-[color:var(--dg-fg-muted)] shrink-0">{label}</span>
      <span
        className={`text-[12px] text-[color:var(--dg-fg)] truncate text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function PlanCard({
  name, price, period, detail, current, highlighted, activeLabel,
}: {
  name: string; price: string; period?: string; detail: string;
  current: boolean; highlighted?: boolean; activeLabel: string;
}) {
  return (
    <div
      className={`bg-[color:var(--dg-canvas)] p-5 ${
        highlighted ? "shadow-[inset_0_1px_0_0_var(--dg-electric)]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="dg-label">{name}</div>
        {current && (
          <span className="inline-flex items-center gap-1 rounded border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
            <span className="h-1 w-1 rounded-full bg-[color:var(--dg-electric)]" />
            {activeLabel}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-sans text-xl font-semibold text-[color:var(--dg-fg)]">{price}</span>
        {period && (
          <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{period}</span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--dg-fg-muted)]">{detail}</p>
    </div>
  );
}
