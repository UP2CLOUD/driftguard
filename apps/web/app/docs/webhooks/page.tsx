import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { pageMeta, jsonLdBreadcrumb, jsonLdArticle, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

const EVENTS = [
  {
    name: "analysis.completed",
    desc: "Fired after every PR analysis finishes. Includes risk score, findings count, and a link to the full report.",
    payload: `{
  "event": "analysis.completed",
  "analysis_id": "a1b2c3d4",
  "repo": "acme/infra",
  "pr_number": 42,
  "head_sha": "abc1234",
  "risk_score": 67,
  "findings": 8,
  "status": "completed",
  "timestamp": "2026-05-21T10:00:00Z"
}`,
  },
  {
    name: "policy.blocked",
    desc: "Fired when a PR is blocked by a policy rule. Sent before the PR comment so you can react immediately.",
    payload: `{
  "event": "policy.blocked",
  "analysis_id": "a1b2c3d4",
  "repo": "acme/infra",
  "pr_number": 42,
  "rule": "aws_rds_cluster.*.delete",
  "resource": "aws_rds_cluster.prod",
  "timestamp": "2026-05-21T10:00:00Z"
}`,
  },
  {
    name: "drift.detected",
    desc: "Fired when real cloud state diverges from the Terraform plan by more than the configured threshold.",
    payload: `{
  "event": "drift.detected",
  "repo": "acme/infra",
  "pr_number": 42,
  "drifted_resources": ["aws_instance.web-01", "aws_security_group.app"],
  "severity": "high",
  "timestamp": "2026-05-21T10:00:00Z"
}`,
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/webhooks",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function Webhooks() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: "Webhooks", path: "/docs/webhooks" }])}
            eyebrow={t("docs.webhooks.eyebrow")} title={t("docs.webhooks.title")} subtitle={t("docs.webhooks.subtitle")}
      narrow
    >
      <div className="space-y-10">
        {/* Setup */}
        <section className="space-y-3 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.setup")}</h2>
          <p>
            Go to <strong className="text-[color:var(--dg-fg)]">{t("docs.webhookPath")}</strong> and add your endpoint URL.
            DriftGuard signs every request with an HMAC-SHA256 signature in the
            <code className="mx-1 font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-surface)] px-1.5 py-0.5 rounded">{t("docs.signature")}</code>
            header.
          </p>
          <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">{`# Verify signature (Python)
import hashlib, hmac
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";



def verify(payload: bytes, sig: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)`}</pre>
        </section>

        {/* Events */}
        <section>
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-5">{t("docs.events")}</h2>
          <div className="space-y-6">
            {EVENTS.map((e) => (
              <div key={e.name} className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-3">
                  <code className="font-mono text-[12px] font-semibold text-[color:var(--dg-electric-bright)]">{e.name}</code>
                </div>
                <div className="px-4 py-3 text-[12px] text-[color:var(--dg-fg-muted)] border-b border-[color:var(--dg-border)]">{e.desc}</div>
                <pre className="overflow-x-auto bg-[color:var(--dg-surface)] px-4 py-4 font-mono text-[11px] text-[color:var(--dg-fg)]">{e.payload}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* Retry policy */}
        <section className="space-y-3 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
          <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.retryPolicy")}</h2>
          <p>
            DriftGuard retries failed deliveries (non-2xx or timeout) with exponential backoff:
            1s → 5s → 30s → 5min → 30min. After 5 failures the webhook is suspended.
            You can manually re-enable it from the dashboard.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
