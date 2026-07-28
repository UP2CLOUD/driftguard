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
    path:        "/docs/rate-limits",
    locale,
    title:       "Rate limits — DriftGuard",
    description: "Per-org and per-API-key quotas on the DriftGuard REST API, the 429 response shape, and how to handle throttling with backoff.",
  });
}

const HEADERS = `HTTP/1.1 200 OK
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1753093451     # unix epoch when the window resets`;

const THROTTLED = `HTTP/1.1 429 Too Many Requests
Retry-After: 12
{
  "detail": "Rate limit exceeded. Retry after 12s.",
  "status": 429
}`;

export default async function RateLimits() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.rateLimits.title"), path: "/docs/rate-limits" },
      ])}
      eyebrow={t("docs.rateLimits.eyebrow")}
      title={t("docs.rateLimits.title")}
      subtitle={t("docs.rateLimits.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.rateLimits.quotasTitle")}</h2>
          <p>
            {t("docs.rateLimits.quotasBodyIntro")} <a href="/docs/api" className="text-[color:var(--dg-electric-bright)] hover:underline">REST API</a> {t("docs.rateLimits.quotasBodyMiddle")}
            (<code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/health</code>,{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/ready</code>){t("docs.rateLimits.quotasBodyOutro")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>{t("docs.rateLimits.bullet1Prefix")} <span className="font-mono text-[color:var(--dg-fg)]">{t("docs.rateLimits.bullet1Value")}</span> {t("docs.rateLimits.bullet1Suffix")}</li>
            <li>{t("docs.rateLimits.bullet2Prefix")}<code className="font-mono text-[color:var(--dg-electric-bright)]">POST /api/v1/memory/recall</code>{t("docs.rateLimits.bullet2Suffix")}</li>
            <li>{t("docs.rateLimits.bullet3")}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.rateLimits.headersTitle")}</h2>
          <p>{t("docs.rateLimits.headersBody")}</p>
          <div className="mt-3">
            <CodeBlock code={HEADERS} filename="response-headers.txt" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.rateLimits.handling429Title")}</h2>
          <p>
            {t("docs.rateLimits.handling429BodyIntro")} <code className="font-mono text-[color:var(--dg-electric-bright)]">429</code> {t("docs.rateLimits.handling429BodyMiddle")}
            <code className="font-mono text-[color:var(--dg-electric-bright)]"> Retry-After</code> {t("docs.rateLimits.handling429BodyOutro")}
          </p>
          <div className="mt-3">
            <CodeBlock code={THROTTLED} filename="429.txt" />
          </div>
          <p className="mt-3">
            {t("docs.rateLimits.contactBodyIntro")}{" "}
            <a href="mailto:support@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">support@driftguard.io</a> {t("docs.rateLimits.contactBodyOutro")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
