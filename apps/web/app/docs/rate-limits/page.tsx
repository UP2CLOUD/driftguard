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
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Quotas</h2>
          <p>
            The <a href="/docs/api" className="text-[color:var(--dg-electric-bright)] hover:underline">REST API</a> is
            rate-limited per organization and per API key using a sliding window. Health and readiness probes
            (<code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/health</code>,{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/ready</code>) are exempt.
            Webhook delivery from GitHub is not counted against your API quota.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Default: <span className="font-mono text-[color:var(--dg-fg)]">120 requests / minute</span> per API key.</li>
            <li>Memory recall (<code className="font-mono text-[color:var(--dg-electric-bright)]">POST /api/v1/memory/recall</code>) is metered separately as it is compute-heavy.</li>
            <li>Limits are advisory during early access and may be adjusted — contact support to raise them.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Reading the headers</h2>
          <p>Every response carries the current window state so you can throttle before hitting the limit:</p>
          <div className="mt-3">
            <CodeBlock code={HEADERS} filename="response-headers.txt" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Handling 429s</h2>
          <p>
            When you exceed the limit the API returns <code className="font-mono text-[color:var(--dg-electric-bright)]">429</code> with a
            <code className="font-mono text-[color:var(--dg-electric-bright)]"> Retry-After</code> header. Wait that many seconds, then
            retry with exponential backoff and jitter:
          </p>
          <div className="mt-3">
            <CodeBlock code={THROTTLED} filename="429.txt" />
          </div>
          <p className="mt-3">
            To request a higher quota, email{" "}
            <a href="mailto:support@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">support@driftguard.io</a> with
            your org and expected request volume.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
