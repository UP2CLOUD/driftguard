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
    title:       "Security & data handling — DriftGuard",
    description: "How DriftGuard handles your data: least-privilege cloud access, HMAC-verified webhooks, encryption, and no long-lived cloud keys.",
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
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Data handling</h2>
          <p>
            DriftGuard analyses your Terraform plan and diff, not your application data. Data is encrypted at rest
            (AES-256) and in transit (TLS 1.3 minimum). Secrets live in a managed secret store — never in source or
            plain environment files. See the full{" "}
            <a href="/security" className="text-[color:var(--dg-electric-bright)] hover:underline">security posture page</a> for
            the current control list.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Least-privilege cloud access</h2>
          <p>
            Drift detection reads live state through short-lived, read-only credentials only — AWS via STS AssumeRole,
            GCP via Workload Identity Federation, Azure via federated workload identity. DriftGuard stores no
            long-lived cloud keys. If you never enable a cloud integration, DriftGuard only ever sees the Terraform
            plan attached to the PR.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Webhook verification (HMAC)</h2>
          <p>
            Every GitHub webhook is signed with your{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">GITHUB_WEBHOOK_SECRET</code> and verified
            with an HMAC-SHA256 constant-time comparison before any work is queued:
          </p>
          <div className="mt-3">
            <CodeBlock code={HMAC} filename="verify.py" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Tuning the security scan</h2>
          <p>Checkov runs on every plan. Suppress specific rules or make it non-blocking per repo:</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
          <p className="mt-3">
            Report a vulnerability to{" "}
            <a href="mailto:security@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">security@driftguard.io</a>.
            DriftGuard is in early access; SOC 2 is in progress.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
