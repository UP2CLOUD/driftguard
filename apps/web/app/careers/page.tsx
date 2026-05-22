import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = {
  ...pageMeta({
    title: "Careers — DriftGuard",
    description: "Join the team building AI runtime safety for Terraform infrastructure. Remote-first, EU-based. Senior engineers wanted.",
    path: "/careers",
    keywords: ["DriftGuard jobs", "infrastructure engineering jobs", "EU remote engineering"],
  }),
};

const ROLES = [
  {
    title: "Senior Backend Engineer — Python / FastAPI",
    type: "Full-time",
    location: "Remote (EU)",
    tags: ["Python", "FastAPI", "Celery", "PostgreSQL", "AWS"],
    desc: "Own the analyzer pipeline — from GitHub webhooks to AI triage to PR comments. You'll work across the Terraform plan parser, Checkov integration, and Claude API orchestration.",
  },
  {
    title: "DevOps / Platform Engineer",
    type: "Full-time",
    location: "Remote (EU)",
    tags: ["GCP", "Terraform", "Kubernetes", "Cloud Run", "Observability"],
    desc: "Own the infra stack: Cloud Run services, Terraform modules, CI/CD pipelines, and customer-facing IAM integration. Strong IaC background essential.",
  },
  {
    title: "Full-Stack Engineer — Next.js",
    type: "Full-time",
    location: "Remote (EU)",
    tags: ["Next.js", "TypeScript", "React", "Tailwind"],
    desc: "Build the dashboard, findings table, analysis viewer, and onboarding flows. You'll own the full user experience from GitHub App install to first PR review.",
  },
  {
    title: "ML / AI Engineer",
    type: "Part-time / Contract",
    location: "Remote",
    tags: ["LLMs", "RAG", "pgvector", "Prompt Engineering", "Evals"],
    desc: "Improve the semantic memory system: embedding quality, recall accuracy, eval harness. Work directly with the Claude API and Voyage embeddings.",
  },
] as const;

const VALUES = [
  { v: "Remote-first", desc: "EU timezone preferred. No offices, no commutes." },
  { v: "High ownership", desc: "Small team. You own your surface end-to-end." },
  { v: "Ship fast", desc: "We iterate weekly. Strong opinions about scope." },
  { v: "Open-core", desc: "Core analyzer is open source. You build in public." },
];

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
          {VALUES.map(({ v, desc }) => (
            <div key={v} className="bg-[color:var(--dg-canvas)] px-5 py-5">
              <div className="dg-label mb-2">{v}</div>
              <p className="text-[12px] text-[color:var(--dg-fg-muted)]">{desc}</p>
            </div>
          ))}
        </div>

        {/* Open roles */}
        <section>
          <div className="dg-label mb-5">Open roles</div>
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
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                        {role.type}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                        {role.location}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`mailto:jobs@driftguard.io?subject=${encodeURIComponent(role.title)}`}
                    className="dg-button dg-button-ghost text-[12px] shrink-0"
                  >
                    Apply →
                  </a>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[12px] text-[color:var(--dg-fg-muted)] mb-3">{role.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]"
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
            <div className="dg-label mb-1">Don&apos;t see your role?</div>
            <p className="text-[12px] text-[color:var(--dg-fg-muted)]">
              We hire on skills, not titles. Send your background and what you want to build.
            </p>
          </div>
          <a href="mailto:jobs@driftguard.io" className="dg-button dg-button-primary text-[12px] shrink-0">
            Get in touch →
          </a>
        </div>
      </div>
    </MarketingPageShell>
  );
}
