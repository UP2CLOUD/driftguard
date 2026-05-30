import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta, localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";



const RELEASES = [
  {
    version: "v0.1.0-beta",
    date: "2026-05-21",
    tag: "Beta",
    items: [
      { type: "new", text: "GitHub App — PR reviews on every Terraform/OpenTofu push" },
      { type: "new", text: "Semantic memory — pgvector recall of similar past incidents with cosine similarity" },
      { type: "new", text: "Infracost integration — monthly cost delta per resource on every PR" },
      { type: "new", text: "Checkov security scanning — 255 rules mapped to DORA/NIS2/ISO 27001/CIS" },
      { type: "new", text: "AI review — Claude claude-sonnet-4-6 summarises intent, blast radius, fixes" },
      { type: "new", text: "GitHub Check Runs — merge blocked when risk score ≥ 70" },
      { type: "new", text: "AWS STS integration — real state vs plan drift detection via AssumeRole" },
      { type: "new", text: "Stripe billing — Free / Team / Enterprise plans with usage-based limits" },
      { type: "new", text: "Dashboard — repo list, analysis history, findings table with expandable fixes" },
      { type: "new", text: "i18n — 6 locales: English, Português, Español, 中文, हिन्दी, العربية" },
      { type: "new", text: "Rate limiting — token bucket per IP, readiness probe, metrics endpoint" },
    ],
  },
  {
    version: "v0.0.3",
    date: "2026-04-30",
    tag: "Alpha",
    items: [
      { type: "new", text: "Multi-framework compliance mapping (DORA, NIS2, ISO 27001, GDPR, CIS)" },
      { type: "new", text: "Celery + Redis worker queue for async analysis pipeline" },
      { type: "new", text: "Cloudflare R2 plan artifact storage with AES-256 encryption" },
      { type: "new", text: "Resend transactional email (welcome, review complete, policy violation)" },
      { type: "new", text: "PostHog analytics + Sentry error tracking integration" },
      { type: "fix", text: "LLM fallback router — OpenAI on Claude 529/timeout" },
    ],
  },
  {
    version: "v0.0.2",
    date: "2026-04-10",
    tag: "Alpha",
    items: [
      { type: "new", text: "Drift detection engine — compares plan resources to tfstate" },
      { type: "new", text: "Policy engine — block/warn pattern matching in driftguard.yml" },
      { type: "new", text: "PR comment formatter with severity heat-map and recall citations" },
      { type: "fix", text: "Parallel Terraform directory analysis (semaphore 3)" },
      { type: "fix", text: "GitHub App JWT rotation on expiry" },
    ],
  },
  {
    version: "v0.0.1",
    date: "2026-03-15",
    tag: "Alpha",
    items: [
      { type: "new", text: "Initial FastAPI backend with GitHub webhook receiver" },
      { type: "new", text: "Basic Terraform plan parsing and Checkov integration" },
      { type: "new", text: "Next.js 15 dashboard skeleton with NextAuth v5" },
      { type: "new", text: "GCP Cloud Run + Terraform bootstrap infra" },
    ],
  },
] as const;

const TYPE_STYLE = {
  new: "text-allowed border-allowed/30 bg-allowed/10",
  fix: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
  breaking: "text-blocked border-blocked/30 bg-blocked/10",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/changelog",
    locale,
    title:       t("changelog.meta.title"),
    description: t("changelog.meta.description"),
  });
}

export default async function Changelog() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell eyebrow={t("changelog.eyebrow")} title={t("changelog.title")} subtitle={t("changelog.subtitle")} narrow>
      <div className="space-y-14">
        {RELEASES.map((r) => (
          <div key={r.version}>
            <div className="flex items-center gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-sans text-[18px] font-semibold tracking-tight text-[color:var(--dg-fg)]">
                    {r.version}
                  </h2>
                  <span className="rounded border border-[color:var(--dg-border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                    {r.tag}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">{r.date}</div>
              </div>
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
              {r.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] px-4 py-3"
                >
                  <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${TYPE_STYLE[item.type]}`}>
                    {t(`changelog.${item.type}` as any)}
                  </span>
                  <span className="text-[12px] text-[color:var(--dg-fg-muted)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 text-center">
          <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
            Subscribe to release notes →{" "}
            <a href="mailto:updates@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">
              updates@driftguard.io
            </a>
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
