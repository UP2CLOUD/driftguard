import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { pageMeta, jsonLdBreadcrumb, jsonLdArticle, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/drift",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function Drift() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: "Drift detection", path: "/docs/drift" }])}
      eyebrow={t("docs.drift.eyebrow")} title={t("docs.drift.title")} subtitle={t("docs.drift.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.howItWorks")}</h2>
        <p>DriftGuard compares the resources in your <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> output against the real state in your cloud account. Any resource that exists in the plan but not in live state (or vice-versa) is flagged as drift.</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.awsIntegration")}</h2>
        <p>Grant DriftGuard read-only access to your AWS account via STS AssumeRole. DriftGuard fetches the S3 state backend and compares it to the PR plan. No credentials are stored — only short-lived session tokens from STS.</p>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)] mt-3">{`# In your repo settings (DriftGuard dashboard)
aws_role_arn: arn:aws:iam::123456789:role/DriftGuardReadOnly
state_bucket: my-tf-state-bucket
state_key: prod/terraform.tfstate
aws_region: eu-west-1`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.withoutAws")}</h2>
        <p>Without AWS integration, DriftGuard falls back to comparing the plan against any <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform.tfstate</code> file committed in the repository. This is less accurate but requires no IAM setup.</p></div>
      </div>
    </MarketingPageShell>
  );
}
