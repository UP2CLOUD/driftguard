import { DashboardNav } from "@/components/DashboardNav";
import { BillingActions } from "@/components/BillingActions";
import { getOrg } from "@/lib/api";

export default async function Settings({ params }: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await params;
  const org = await getOrg(installationId);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardNav installationId={installationId} planLabel={org.plan} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">Settings</h1>

        <section className="mt-8 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Subscription & Billing</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Current active tier: <span className="text-orange-400 font-mono font-semibold uppercase">{org.plan}</span>
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <PlanCard
              name="Free"
              price="€0"
              detail="1 repo · 50 PRs/mo · cost + drift"
              current={org.plan === "free"}
            />
            <PlanCard
              name="Pro"
              price="€29"
              detail="unlimited PRs · security · Slack"
              current={org.plan === "pro"}
            />
            <PlanCard
              name="Team"
              price="€99"
              detail="policy · autofix · priority"
              current={org.plan === "team"}
            />
          </div>

          <div className="mt-8">
            <BillingActions orgId={org.id} installationId={installationId} hasCustomer={org.has_stripe_customer} plan={org.plan} />
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
}: {
  name: string;
  price: string;
  detail: string;
  current: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 transition-all duration-150 ${current ? "border-orange-500/30 bg-orange-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{name}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-zinc-100">{price}</div>
      <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{detail}</p>
      {current && (
        <span className="inline-flex mt-3 text-[9px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
          Active Plan
        </span>
      )}
    </div>
  );
}
