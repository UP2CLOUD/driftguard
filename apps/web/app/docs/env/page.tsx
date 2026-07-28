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
    path:        "/docs/env",
    locale,
    title:       "Environment variables — DriftGuard",
    description: "Full reference for the DriftGuard API environment variables — required secrets, optional integrations, and defaults.",
  });
}

interface EnvVar {
  name: string;
  required: boolean;
  desc: string;
  example: string;
}

function buildRequired(t: (key: string) => string): EnvVar[] {
  return [
    { name: "SECRET_KEY",             required: true, desc: t("docs.env.req_secretKey"),             example: "hex, 32 bytes" },
    { name: "DATABASE_URL",           required: true, desc: t("docs.env.req_databaseUrl"),            example: "postgres://user:pass@host:5432/driftguard" },
    { name: "REDIS_URL",              required: true, desc: t("docs.env.req_redisUrl"),               example: "redis://host:6379/0" },
    { name: "GITHUB_APP_ID",          required: true, desc: t("docs.env.req_githubAppId"),            example: "123456" },
    { name: "GITHUB_APP_PRIVATE_KEY", required: true, desc: t("docs.env.req_githubAppPrivateKey"),    example: "-----BEGIN RSA PRIVATE KEY-----…" },
    { name: "GITHUB_WEBHOOK_SECRET",  required: true, desc: t("docs.env.req_githubWebhookSecret"),    example: "whsec_…" },
    { name: "ANTHROPIC_API_KEY",      required: true, desc: t("docs.env.req_anthropicApiKey"),        example: "sk-ant-…" },
  ];
}

function buildOptional(t: (key: string) => string): EnvVar[] {
  return [
    { name: "ANTHROPIC_MODEL",       required: false, desc: t("docs.env.opt_anthropicModel"),     example: "claude-haiku-4-5-20251001" },
    { name: "INFRACOST_API_KEY",     required: false, desc: t("docs.env.opt_infracostApiKey"),     example: "ico-…" },
    { name: "STRIPE_API_KEY",        required: false, desc: t("docs.env.opt_stripeApiKey"),        example: "sk_live_…" },
    { name: "STRIPE_WEBHOOK_SECRET", required: false, desc: t("docs.env.opt_stripeWebhookSecret"), example: "whsec_…" },
    { name: "RESEND_API_KEY",        required: false, desc: t("docs.env.opt_resendApiKey"),        example: "re_…" },
    { name: "SENTRY_DSN",            required: false, desc: t("docs.env.opt_sentryDsn"),           example: "https://…@sentry.io/…" },
    { name: "ENVIRONMENT",           required: false, desc: t("docs.env.opt_environment"),         example: "production" },
    { name: "PORT",                  required: false, desc: t("docs.env.opt_port"),                example: "8000" },
  ];
}

const DOTENV = `# .env — minimum to boot the API
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgres://user:pass@localhost:5432/driftguard
REDIS_URL=redis://localhost:6379/0
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="$(cat app.pem)"
GITHUB_WEBHOOK_SECRET=whsec_…
ANTHROPIC_API_KEY=sk-ant-…`;

function Table({ label, rows }: { label: string; rows: EnvVar[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[15px] font-semibold text-[color:var(--dg-fg)]">{label}</h2>
      <div className="overflow-hidden rounded-md border border-[color:var(--dg-border)]">
        {rows.map((v) => (
          <div
            key={v.name}
            className="grid grid-cols-1 gap-1 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(200px,1fr)_1.4fr]"
          >
            <code className="font-mono text-[12px] text-[color:var(--dg-electric-bright)]">{v.name}</code>
            <span className="text-[12px] text-[color:var(--dg-fg-muted)]">
              {v.desc}
              <span className="mt-0.5 block font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">e.g. {v.example}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Env() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.env.title"), path: "/docs/env" },
      ])}
      eyebrow={t("docs.env.eyebrow")}
      title={t("docs.env.title")}
      subtitle={t("docs.env.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <p>{t("docs.env.introBody")}</p>

        <Table label={t("docs.env.requiredLabel")} rows={buildRequired(t)} />
        <Table label={t("docs.env.optionalLabel")} rows={buildOptional(t)} />

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.env.minimalTitle")}</h2>
          <div className="mt-3">
            <CodeBlock code={DOTENV} filename=".env" />
          </div>
          <p className="mt-3">{t("docs.env.minimalFooter")}</p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
