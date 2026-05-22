import { BillingActions } from "@/components/BillingActions";
import { UserPreferencesSettings } from "@/components/UserPreferencesSettings";
import { AwsIntegrationForm } from "@/components/AwsIntegrationForm";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import type { Org } from "@/lib/api";

export const metadata = { title: "Settings · DriftGuard" };

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
  try {
    org = await requireOrg(installationId);
  } catch {
    /* API offline — still render preferences */
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-14">
      {/* Page header */}
      <div>
        <div className="dg-label">Workspace ▸ {installationId}</div>
        <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          Settings
        </h1>
      </div>

      {/* API offline warning */}
      {!org && (
        <div className="flex items-start gap-3 rounded-md border border-warned/30 bg-warned/5 px-4 py-3">
          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
          <p className="font-mono text-[11px] text-warned">
            Backend API offline — billing and AWS sections unavailable.
            Install from{" "}
            <span className="opacity-70">{process.env.NEXT_PUBLIC_API_URL ?? "not set"}</span>
          </p>
        </div>
      )}

      {/* ── Preferences ─────────────────────────────────────────── */}
      <Section title={t("settings.preferences")} description={t("settings.preferencesDesc")}>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <UserPreferencesSettings initialPreferences={preferences} />
        </div>
      </Section>

      {/* ── AWS Integration ─────────────────────────────────────── */}
      <Section
        title="AWS integration"
        description={t("settings.awsDesc")}
      >
        <AwsIntegrationForm installationId={installationId} org={org} />
      </Section>

      {/* ── Billing ─────────────────────────────────────────────── */}
      {org && (
        <Section title={t("settings.billingTitle")} description={t("settings.billingDesc")}>
          <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] sm:grid-cols-3 mb-4">
            <PlanCard name="Free"       price="€0"  detail="50 PR analyses/mo · 1 repo"              current={org.plan === "free"} />
            <PlanCard name="Team"       price="€29" detail="Unlimited PRs · memory · compliance"     current={org.plan === "team"} period="/repo/mo" highlighted />
            <PlanCard name="Enterprise" price="—"   detail="Self-hosted · SSO · SLA · custom policy" current={org.plan === "enterprise"} />
          </div>
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
            <div className="text-[13px] font-semibold text-[color:var(--dg-fg)]">Remove DriftGuard</div>
            <p className="mt-1 text-[12px] text-[color:var(--dg-fg-muted)]">
              Uninstall the GitHub App. All analyses and memory will be deleted within 30 days.
            </p>
          </div>
          <a
            href={`https://github.com/settings/installations/${installationId}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded border border-blocked/40 bg-blocked/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-blocked hover:bg-blocked/20 transition"
          >
            Uninstall →
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
  name, price, period, detail, current, highlighted,
}: {
  name: string; price: string; period?: string; detail: string;
  current: boolean; highlighted?: boolean;
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
          <span className="inline-flex items-center gap-1 rounded border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
            <span className="h-1 w-1 rounded-full bg-[color:var(--dg-electric)]" />
            Active
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
