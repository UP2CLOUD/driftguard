import { MarketingPageShell } from "@/components/MarketingPageShell";
export const metadata = { title: "Cost Analysis — DriftGuard Docs" };
export default function Cost() {
  return (
    <MarketingPageShell eyebrow="Docs · Core concepts" title="Cost analysis" subtitle="Monthly cost delta on every Terraform PR — before it merges." narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">Powered by Infracost</h2>
        <p>DriftGuard runs Infracost on every Terraform plan JSON and reports the monthly cost delta per resource. If a PR would add €500/month of EC2 instances, that appears in the PR comment before anyone merges.</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">Thresholds</h2>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">{`# .github/driftguard.yml
cost:
  threshold_monthly_usd: 500    # warn above $500/mo delta
  block_above: 5000             # block merge above $5000/mo delta`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">Currency</h2>
        <p>Cost is reported in the currency configured in your workspace settings. Exchange rates are fetched daily. Supported: USD, EUR, GBP, BRL.</p></div>
      </div>
    </MarketingPageShell>
  );
}
