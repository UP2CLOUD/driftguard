import { DashboardNav } from "@/components/DashboardNav";
import { BillingActions } from "@/components/BillingActions";
import { getOrg } from "@/lib/api";

export default async function Settings({ params }: { params: Promise<{ installationId: string }> }) {
  const { installationId } = await params;
  const org = await getOrg(installationId);

  return (
    <main className="min-h-screen">
      <DashboardNav installationId={installationId} planLabel={org.plan} />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold">Settings</h1>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Billing</h2>
          <p className="mt-2 text-sm text-muted">
            Current plan: <strong className="text-ink">{org.plan}</strong>
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
            <BillingActions orgId={org.id} hasCustomer={org.has_stripe_customer} plan={org.plan} />
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
    <div className={`rounded-lg border p-5 ${current ? "border-accent bg-accent/5" : "border-ink/15 bg-white/40"}`}>
      <div className="font-display text-xs uppercase tracking-widest text-muted">{name}</div>
      <div className="mt-2 font-display text-2xl font-bold">{price}</div>
      <p className="mt-2 text-sm text-muted">{detail}</p>
      {current && (
        <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">current</div>
      )}
    </div>
  );
}
