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
    path:        "/docs/policies",
    locale,
    title:       t("docs.policies.metaTitle"),
    description: t("docs.policies.metaDescription"),
  });
}

export default async function Policies() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.policies.title"), path: "/docs/policies" }])}
      eyebrow={t("docs.policies.eyebrow")} title={t("docs.policies.title")} subtitle={t("docs.policies.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.policies.configLabel")}</h2>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">{`# .github/driftguard.yml
policy:
  # These patterns will BLOCK the PR (exit 1 in CI)
  block:
    - aws_rds_cluster.*.delete         # never delete prod databases
    - aws_iam_policy.*.resources=*     # no wildcard IAM

  # These patterns will WARN in the PR comment but allow merge
  warn:
    - aws_security_group.ingress.0.0.0.0/0
    - aws_s3_bucket.*.acl=public-read`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.patternSyntax")}</h2>
        <p>{t("docs.policies.patternSyntaxBodyPre")} <code className="font-mono text-[color:var(--dg-electric-bright)]">resource_type.name.attribute=value</code>. {t("docs.policies.patternSyntaxBodyMid")}<code className="font-mono text-[color:var(--dg-electric-bright)]">*</code>{t("docs.policies.patternSyntaxBodyPost")}</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.opaRego")}</h2>
        <p>{t("docs.policies.opaRegoBody")}</p></div>
      </div>
    </MarketingPageShell>
  );
}
