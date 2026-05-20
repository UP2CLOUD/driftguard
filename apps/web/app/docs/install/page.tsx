import { MarketingPageShell } from "@/components/MarketingPageShell";
export const metadata = { title: "Install — DriftGuard Docs" };

const STEPS = [
  { n: "01", title: "Install the GitHub App", code: "open https://github.com/apps/driftguard-app/installations/new", desc: "Select your organisation or personal account. Grant access to the repositories that have Terraform." },
  { n: "02", title: "Add config to your repo", code: `cat > .github/driftguard.yml << 'EOF'
policy:
  block:
    - aws_rds_cluster.*.delete
    - aws_iam_policy.*.resources=*
  warn:
    - aws_security_group.ingress.0.0.0.0/0
compliance:
  frameworks: [DORA, NIS2, ISO27001]
cost:
  threshold_monthly_usd: 500
EOF`, desc: "Commit this file to any branch. DriftGuard reads it on every PR." },
  { n: "03", title: "Open a Terraform PR", code: "git checkout -b test/driftguard-review\n# edit any .tf file\ngit push && open a PR", desc: "DriftGuard will comment within ~30s. Check the Actions tab if it doesn\'t appear." },
];

export default function Install() {
  return (
    <MarketingPageShell eyebrow="Docs · Get started" title="Install in 30 seconds" subtitle="Three steps. No SDK, no rewrites, no infra changes." narrow>
      <div className="space-y-10">
        {STEPS.map((s) => (
          <div key={s.n} className="relative pl-8 border-l border-[color:var(--dg-border)]">
            <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-[color:var(--dg-electric)] bg-[color:var(--dg-canvas)]" />
            <div className="dg-label mb-2">{s.n}</div>
            <h2 className="text-[16px] font-semibold text-[color:var(--dg-fg)] mb-3">{s.title}</h2>
            <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)] mb-3">{s.code}</pre>
            <p className="text-[13px] text-[color:var(--dg-fg-muted)]">{s.desc}</p>
          </div>
        ))}
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">Having trouble? Check the <a href="/docs/webhooks" className="text-[color:var(--dg-electric-bright)] hover:underline">webhook guide</a> or email us.</p>
          <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px]">Get help</a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
