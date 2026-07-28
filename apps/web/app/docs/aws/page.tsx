import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { jsonLdBreadcrumb, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { CodeBlock } from "@/components/docs/CodeBlock";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/aws",
    locale,
    title:       "AWS integration — DriftGuard",
    description: "Connect AWS to DriftGuard with a read-only STS AssumeRole so drift detection can compare your Terraform plan against live state — no long-lived keys stored.",
  });
}

const TRUST = `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::DRIFTGUARD_ACCOUNT_ID:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "YOUR_ORG_EXTERNAL_ID" }
    }
  }]
}`;

const PERMS = `{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:Describe*",
      "rds:Describe*",
      "s3:GetBucketPolicy",
      "s3:ListAllMyBuckets",
      "iam:GetPolicy",
      "iam:ListRoles"
    ],
    "Resource": "*"
  }]
}`;

const CONFIG = `# .github/driftguard.yml
integrations:
  aws:
    role_arn: arn:aws:iam::123456789012:role/DriftGuardReadOnly
    region: eu-west-1
    state_backend: s3://acme-tfstate/prod/terraform.tfstate`;

export default async function Aws() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.aws.title"), path: "/docs/aws" },
      ])}
      eyebrow={t("docs.aws.eyebrow")}
      title={t("docs.aws.title")}
      subtitle={t("docs.aws.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.howItWorksTitle")}</h2>
          <p>{t("docs.aws.howItWorksBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.step1Title")}</h2>
          <h3 className="mb-1 mt-3 text-[13px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.trustPolicyTitle")}</h3>
          <p>{t("docs.aws.step1Intro")}</p>
          <div className="mt-3">
            <CodeBlock code={TRUST} filename="trust-policy.json" />
          </div>
          <h3 className="mb-1 mt-5 text-[13px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.permsPolicyTitle")}</h3>
          <p>{t("docs.aws.permsIntro")}</p>
          <div className="mt-3">
            <CodeBlock code={PERMS} filename="permissions-policy.json" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.step2Title")}</h2>
          <p>{t("docs.aws.step2Body")}</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
          <p className="mt-3">{t("docs.aws.step2Verify")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.aws.withoutAwsTitle")}</h2>
          <p>{t("docs.aws.withoutAwsBody")}</p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
