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
    path:        "/docs/security",
    locale,
    title:       t("docs.security.metaTitle"),
    description: t("docs.security.metaDescription"),
  });
}

const HMAC = `# GitHub signs every webhook; DriftGuard verifies before processing.
signature = "sha256=" + hmac_sha256(GITHUB_WEBHOOK_SECRET, raw_body)
# constant-time compare against the X-Hub-Signature-256 header.
# Mismatch -> 401, request dropped, nothing enqueued.`;

const CONFIG = `# .github/driftguard.yml
security:
  checkov:
    enabled: true
    skip_checks: []          # e.g. ["CKV_AWS_18"] to suppress a specific rule
    soft_fail: false         # true = report only, never block on Checkov alone`;

export default async function Security() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.security.title"), path: "/docs/security" },
      ])}
      eyebrow={t("docs.security.eyebrow")}
      title={t("docs.security.title")}
      subtitle={t("docs.security.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.security.dataHandlingTitle")}</h2>
          <p>
            {t("docs.security.dataHandlingBodyPre")}{" "}
            <a href="/security" className="text-[color:var(--dg-electric-bright)] hover:underline">{t("docs.security.dataHandlingLinkText")}</a>{" "}
            {t("docs.security.dataHandlingBodyPost")}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.security.leastPrivilegeTitle")}</h2>
          <p>
            {t("docs.security.leastPrivilegeBody")}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.security.webhookVerificationTitle")}</h2>
          <p>
            {t("docs.security.webhookVerificationBodyPre")}{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">GITHUB_WEBHOOK_SECRET</code>{" "}
            {t("docs.security.webhookVerificationBodyPost")}
          </p>
          <div className="mt-3">
            <CodeBlock code={HMAC} filename="verify.py" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.security.tuningTitle")}</h2>
          <p>{t("docs.security.tuningBodyPre")}</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
          <p className="mt-3">
            {t("docs.security.tuningBodyPost1")}{" "}
            <a href="mailto:security@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">security@driftguard.io</a>.{" "}
            {t("docs.security.tuningBodyPost2")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
