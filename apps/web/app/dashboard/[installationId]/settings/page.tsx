import { BillingActions } from "@/components/BillingActions";
import { UserPreferencesSettings } from "@/components/UserPreferencesSettings";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";
import type { Org } from "@/lib/api";

export default async function Settings({ params }: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  let org: Org | null = null;
  try {
    org = await requireOrg(installationId);
  } catch {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="dg-label">Workspace ▸ {t("nav.settings")}</div>
        <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
          {t("nav.settings")}
        </h1>
        <div className="mt-8 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 text-center">
          <p className="text-sm text-[color:var(--dg-fg-muted)]">
            {t("settings.apiUnavailable")}
          </p>
          <p className="mt-2 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
            NEXT_PUBLIC_API_URL · {process.env.NEXT_PUBLIC_API_URL ?? "not set"}
          </p>
        </div>
        <section className="mt-10">
          <div className="dg-label mb-4">{t("settings.preferencesTitle")}</div>
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
            <UserPreferencesSettings initialPreferences={preferences} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="dg-label">Workspace ▸ {t("nav.settings")}</div>
      <h1 className="mt-2 font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
        {t("settings.title")}
      </h1>

      {/* Preferences */}
      <section className="mt-10">
        <div className="dg-label mb-4">{t("settings.preferencesTitle")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5">
          <UserPreferencesSettings initialPreferences={preferences} />
        </div>
      </section>

      {/* Plan */}
      <section className="mt-10">
        <div className="dg-label mb-4">{t("settings.billingTitle")}</div>
        <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] sm:grid-cols-3">
          <PlanCard
            name="Free"
            price="€0"
            detail="50 PR analyses/mo · 1 repo"
            current={org.plan === "free"}
          />
          <PlanCard
            name="Pro"
            price="€29"
            period="/repo/mo"
            detail="Unlimited PRs · security · Slack"
            current={org.plan === "pro"}
            highlighted
          />
          <PlanCard
            name="Team"
            price="€99"
            period="/repo/mo"
            detail="Policy · autofix · priority"
            current={org.plan === "team"}
          />
        </div>
        <div className="mt-4">
          <BillingActions
            orgId={org.id}
            installationId={installationId}
            hasCustomer={!!org.has_stripe_customer}
            plan={org.plan}
          />
        </div>
      </section>

      {/* Org details */}
      <section className="mt-10">
        <div className="dg-label mb-4">{t("settings.orgTitle")}</div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
          <Row k="GitHub installation ID" v={installationId} mono />
          <Row k={t("settings.billingCurrent")} v={org.plan} />
          <Row k="Stripe customer" v={org.has_stripe_customer ? "active" : "—"} />
        </div>
      </section>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3">
      <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{k}</span>
      <span className={`text-[12px] text-[color:var(--dg-fg)] ${mono ? "font-mono" : ""}`}>{v}</span>
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
    <div className={`relative bg-[color:var(--dg-canvas)] p-5 ${
      highlighted ? "shadow-[inset_0_1px_0_0_var(--dg-electric)]" : ""
    }`}>
      <div className="flex items-center justify-between">
        <div className="dg-label">{name}</div>
        {current && (
          <span className="inline-flex items-center gap-1 rounded border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
            <span className="h-1 w-1 rounded-full bg-[color:var(--dg-electric)]" />
            Active
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">{price}</span>
        {period && <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{period}</span>}
      </div>
      <p className="mt-2 text-[12px] text-[color:var(--dg-fg-muted)]">{detail}</p>
    </div>
  );
}
