import { type Locale } from "@/i18n/config";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta, localizedPageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";



const ROLES = [
  {
    title: "Senior Backend Engineer — Python / FastAPI",
    typeKey: "fullTime",
    location: "Remote (EU)",
    tags: ["Python", "FastAPI", "Celery", "PostgreSQL", "AWS"],
    desc: "Own the analyzer pipeline — from GitHub webhooks to AI triage to PR comments. You'll work across the Terraform plan parser, Checkov integration, and Claude API orchestration.",
  },
  {
    title: "DevOps / Platform Engineer",
    typeKey: "fullTime",
    location: "Remote (EU)",
    tags: ["GCP", "Terraform", "Kubernetes", "Cloud Run", "Observability"],
    desc: "Own the infra stack: Cloud Run services, Terraform modules, CI/CD pipelines, and customer-facing IAM integration. Strong IaC background essential.",
  },
  {
    title: "Full-Stack Engineer — Next.js",
    typeKey: "fullTime",
    location: "Remote (EU)",
    tags: ["Next.js", "TypeScript", "React", "Tailwind"],
    desc: "Build the dashboard, findings table, analysis viewer, and onboarding flows. You'll own the full user experience from GitHub App install to first PR review.",
  },
  {
    title: "ML / AI Engineer",
    typeKey: "partTime",
    location: "Remote",
    tags: ["LLMs", "RAG", "pgvector", "Prompt Engineering", "Evals"],
    desc: "Improve the semantic memory system: embedding quality, recall accuracy, eval harness. Work directly with the Claude API and Voyage embeddings.",
  },
] as const;

const VALUES = [
  { key: "remoteFirst", descKey: "remoteFirstDesc" },
  { key: "highOwn",     descKey: "highOwnDesc" },
  { key: "shipFast",    descKey: "shipFastDesc" },
  { key: "openCore",    descKey: "openCoreDesc" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/careers",
    locale,
    title:       t("careers.meta.title"),
    description: t("careers.meta.description"),
  });
}

export default async function Careers() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("careers.eyebrow")} title={t("careers.title")} subtitle={t("careers.subtitle")}
      narrow
    >
      <div className="space-y-14">
        {/* Values */}
        <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] grid-cols-2 sm:grid-cols-4">
          {VALUES.map(({ key, descKey }) => (
            <div key={key} className="bg-[color:var(--dg-canvas)] px-5 py-5">
              <div className="dg-label mb-2">{t(`careers.${key}` as any)}</div>
              <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{t(`careers.${descKey}` as any)}</p>
            </div>
          ))}
        </div>

        {/* Open roles */}
        <section>
          <div className="dg-label mb-5">{t("careers.openRoles")}</div>
          <div className="space-y-4">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap px-5 py-4 border-b border-[color:var(--dg-border)]">
                  <div>
                    <h2 className="font-sans text-[14px] font-semibold text-[color:var(--dg-fg)]">
                      {role.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                        {t(`careers.${role.typeKey}` as any)}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                        {role.location}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`mailto:jobs@driftguard.io?subject=${encodeURIComponent(role.title)}`}
                    className="dg-button dg-button-ghost text-[12px] shrink-0"
                  >
                    {t("careers.apply")}
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-3">{role.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-2 py-0.5 font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* No match CTA */}
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="dg-label mb-1">{t("careers.noRole")}</div>
            <p className="text-[12px] text-[color:var(--dg-fg-muted)]">
              {t("careers.noRoleDesc")}
            </p>
          </div>
          <a href="mailto:jobs@driftguard.io" className="dg-button dg-button-primary text-[12px] shrink-0">
            {t("careers.getInTouch")}
          </a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
