import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { jsonLdBreadcrumb, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

function getStepCodes() {
  return [
  `open ${getGitHubAppInstallUrl()}`,
  `cat > .github/driftguard.yml << 'EOF'
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
EOF`,
  "git checkout -b test/driftguard-review\n# edit any .tf file\ngit push && open a PR",
  ];
}

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/install",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function Install() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const stepCodes = getStepCodes();
  const STEPS = [
    { n: "01", title: t("docs.install.step1Title"), code: stepCodes[0], desc: t("docs.install.step1Desc") },
    { n: "02", title: t("docs.install.step2Title"), code: stepCodes[1], desc: t("docs.install.step2Desc") },
    { n: "03", title: t("docs.install.step3Title"), code: stepCodes[2], desc: t("docs.install.step3Desc") },
  ];

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: "Install", path: "/docs/install" }])}
      eyebrow={t("docs.install.eyebrow")} title={t("docs.install.title")} subtitle={t("docs.install.subtitle")} narrow>
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
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("docs.install.troubleText").split("{link}")[0]}
            <a href="/docs/webhooks" className="text-[color:var(--dg-electric-bright)] hover:underline">{t("docs.install.webhookGuide")}</a>
            {t("docs.install.troubleText").split("{link}")[1]}
          </p>
          <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px]">{t("docs.getHelp")}</a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
