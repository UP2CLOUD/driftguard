import { DashboardNav } from "@/components/DashboardNav";
import { BillingActions } from "@/components/BillingActions";
import { UserPreferencesSettings } from "@/components/UserPreferencesSettings";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { requireOrg } from "@/lib/org-server";
import { getUserPreferences } from "@/lib/preferences/server";

export default async function Settings({ params }: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const [org, messages] = await Promise.all([
    requireOrg(installationId),
    getMessages(preferences.locale),
  ]);
  const t = createTranslator(messages);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardNav
        installationId={installationId}
        planLabel={org.plan}
        initialPreferences={preferences}
      />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">{t("settings.title")}</h1>

        <UserPreferencesSettings initialPreferences={preferences} />

        <section className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
            {t("settings.billingTitle")}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {t("settings.billingCurrent")}{" "}
            <span className="font-mono font-semibold uppercase text-orange-400">{org.plan}</span>
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <PlanCard
              name="Free"
              price="€0"
              detail="1 repo · 50 PRs/mo · cost + drift"
              current={org.plan === "free"}
              activeLabel={t("settings.activePlan")}
            />
            <PlanCard
              name="Pro"
              price="€29"
              detail="unlimited PRs · security · Slack"
              current={org.plan === "pro"}
              activeLabel={t("settings.activePlan")}
            />
            <PlanCard
              name="Team"
              price="€99"
              detail="policy · autofix · priority"
              current={org.plan === "team"}
              activeLabel={t("settings.activePlan")}
            />
          </div>

          <div className="mt-8">
            <BillingActions
              orgId={org.id}
              installationId={installationId}
              hasCustomer={org.has_stripe_customer}
              plan={org.plan}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function PlanCard({
  name,
  price,
  detail,
  current,
  activeLabel,
}: {
  name: string;
  price: string;
  detail: string;
  current: boolean;
  activeLabel: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-150 ${
        current ? "border-orange-500/30 bg-orange-500/5" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{name}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-zinc-100">{price}</div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{detail}</p>
      {current && (
        <span className="mt-3 inline-flex rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-orange-400">
          {activeLabel}
        </span>
      )}
    </div>
  );
}
