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
    title:       t("docs.drift.metaTitle"),
    description: t("docs.drift.metaDescription"),
  });
}

export default async function Drift() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: t("docs.drift.title"), path: "/docs/drift" }])}
      eyebrow={t("docs.drift.eyebrow")} title={t("docs.drift.title")} subtitle={t("docs.drift.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.howItWorks")}</h2>
        <p>{t("docs.drift.howItWorksBodyPre")} <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> {t("docs.drift.howItWorksBodyPost")}</p></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.awsIntegration")}</h2>
        <p>{t("docs.drift.awsIntegrationBody")}</p>
        <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)] mt-3">{`# In your repo settings (DriftGuard dashboard)
aws_role_arn: arn:aws:iam::123456789:role/DriftGuardReadOnly
state_bucket: my-tf-state-bucket
state_key: prod/terraform.tfstate
aws_region: eu-west-1`}</pre></div>
        <div><h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{t("docs.withoutAws")}</h2>
        <p>{t("docs.drift.withoutAwsBodyPre")} <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform.tfstate</code> {t("docs.drift.withoutAwsBodyPost")}</p></div>
      </div>
    </MarketingPageShell>
  );
}
