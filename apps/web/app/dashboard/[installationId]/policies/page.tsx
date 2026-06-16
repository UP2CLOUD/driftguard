import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { beGet } from "@/lib/backend";
import { PolicyCreateForm } from "@/components/PolicyCreateForm";
import { PolicyCard } from "@/components/PolicyCard";

async function fetchPolicies(id: string) {
  return (
    (await beGet<unknown[]>(`/api/v1/policies?installation_id=${id}`, {
      revalidate: 30,
      timeout: 3000,
    })) ?? []
  );
}

const TYPE_STYLE: Record<string, string> = {
  block: "text-blocked border-blocked/30 bg-blocked/5",
  warn: "text-warned border-warned/30 bg-warned/5",
  alert: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5",
};

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const policies = await fetchPolicies(installationId);
  const active = policies.filter((p: any) => p.enabled).length;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  const examplePolicies = [
    {
      id: "block-critical",
      name: t("policies.exampleBlockCritical") ?? "Block critical security findings",
      rule_type: "block",
      description: t("policies.exampleBlockCriticalDesc") ?? "Blocks merge when any critical-severity finding is detected.",
      conditions: { severity: "critical" },
    },
    {
      id: "warn-exposure",
      name: t("policies.exampleWarnExposure") ?? "Warn on public exposure",
      rule_type: "warn",
      description: t("policies.exampleWarnExposureDesc") ?? "Warns when resources matching public exposure patterns are changed.",
      conditions: { resource_pattern: "aws_s3_bucket_public_access_block|aws_security_group" },
    },
    {
      id: "block-encryption",
      name: t("policies.exampleRequireEncryption") ?? "Require encryption for storage",
      rule_type: "block",
      description: t("policies.exampleRequireEncryptionDesc") ?? "Blocks unencrypted S3 buckets or RDS instances.",
      conditions: { rule_id_prefix: "S3-ENCRYPTION", severity: "high" },
    },
    {
      id: "alert-iam",
      name: t("policies.exampleAlertIam") ?? "Alert on IAM wildcard permissions",
      rule_type: "alert",
      description: t("policies.exampleAlertIamDesc") ?? "Alerts team when IAM policies with wildcard actions are detected.",
      conditions: { message_contains: "wildcard", rule_id_prefix: "IAM" },
    },
  ];

  const conditionsRef = [
    {
      key: "severity",
      desc: t("policies.condSeverityDesc") ?? "Minimum severity to trigger",
      example: '"critical" | "high" | "medium" | "low"',
    },
    {
      key: "resource_pattern",
      desc: t("policies.condResourcePatternDesc") ?? "Regex matched against resource address",
      example: '"aws_s3_bucket|aws_iam"',
    },
    {
      key: "message_contains",
      desc: t("policies.condMessageContainsDesc") ?? "Substring matched in finding message",
      example: '"wildcard" | "public"',
    },
    {
      key: "rule_id_prefix",
      desc: t("policies.condRuleIdPrefixDesc") ?? "Prefix matched against rule ID",
      example: '"IAM-" | "S3-"',
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("policies.eyebrow") ?? "Policy engine"}</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("policies.title") ?? "Policies"}
          </h1>
          {policies.length > 0 && (
            <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
              {t("policies.subtitle")?.replace("{active}", String(active)).replace("{total}", String(policies.length))}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left: create form + active policies or empty state */}
        <div className="space-y-6">
          <PolicyCreateForm installationId={installationId} />
          {policies.length === 0 ? (
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-12 text-center">
              <div className="mb-3 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("policies.engineReady")}
              </div>
              <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-2">
                {t("policies.noPoliciesTitle")}
              </p>
              <p className="text-[12px] text-[color:var(--dg-fg-subtle)] max-w-md mx-auto leading-relaxed mb-6">
                {t("policies.noPoliciesDesc")}
              </p>
              <a
                href="/docs/policies"
                className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
              >
                {t("policies.docLink") ?? "Read policies documentation →"}
              </a>
            </div>
          ) : (
            <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
              {policies.map((p: any) => (
                <PolicyCard key={p.id} policy={p} installationId={installationId} />
              ))}
            </div>
          )}

          {/* API usage section */}
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("policies.createViaApi")}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-3">
                {t("policies.createViaApiDesc")}
              </p>
              <pre className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-4 py-3 font-sans font-medium text-[10px] text-[color:var(--dg-electric-bright)] overflow-x-auto whitespace-pre-wrap">
{`POST ${apiBase}/api/v1/policies?installation_id=${installationId}
Authorization: Bearer YOUR_SECRET_KEY
Content-Type: application/json

{
  "name": "Block critical findings",
  "rule_type": "block",
  "severity": "critical",
  "conditions": {
    "severity": "critical"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Right: example rules + conditions reference */}
        <div className="space-y-6">
          {/* Example policies */}
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] px-4 py-3">
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("policies.exampleRules") ?? "Example rules"}
              </span>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {examplePolicies.map((ex) => (
                <div key={ex.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest shrink-0 ${TYPE_STYLE[ex.rule_type]}`}
                    >
                      {ex.rule_type}
                    </span>
                    <span className="font-sans text-[12px] font-medium text-[color:var(--dg-fg)] truncate">
                      {ex.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[color:var(--dg-fg-subtle)] leading-relaxed">
                    {ex.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions syntax reference */}
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] px-4 py-3">
              <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {t("policies.conditionsRef") ?? "Conditions reference"}
              </span>
            </div>
            <div className="px-4 py-4 space-y-3">
              {conditionsRef.map((c) => (
                <div key={c.key}>
                  <code className="font-sans font-medium text-[10px] text-[color:var(--dg-electric-bright)]">
                    {c.key}
                  </code>
                  <p className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
                    {c.desc}
                  </p>
                  <p className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] opacity-60">
                    e.g. {c.example}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
