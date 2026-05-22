import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

export const metadata = { title: "Policies — DriftGuard Docs" };
export default async function Policies() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell eyebrow={t("docs.policies.eyebrow")} title={t("docs.policies.title")} subtitle={t("docs.policies.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">driftguard.yml config</h2>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">{`policy:
  # These patterns will BLOCK the PR (exit 1 in CI)
  block:
    - aws_rds_cluster.*.delete         # never delete prod databases
    - aws_iam_policy.*.resources=*     # no wildcard IAM

  # These patterns will WARN in the PR comment but allow merge
  warn:
    - aws_security_group.ingress.0.0.0.0/0
    - aws_s3_bucket.*.acl=public-read`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">Pattern syntax</h2>
        <p>Patterns follow <code className="font-mono text-[color:var(--dg-electric-bright)]">resource_type.name.attribute=value</code>. Wildcards (<code className="font-mono text-[color:var(--dg-electric-bright)]">*</code>) match any value. Patterns are evaluated against every resource change in the Terraform plan.</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">OPA / Rego (Enterprise)</h2>
        <p>Enterprise plans support full OPA Rego policy bundles for complex logic — multi-environment rules, team-based access, time-based restrictions. Contact us for the Rego integration guide.</p></div>
      </div>
    </MarketingPageShell>
  );
}
