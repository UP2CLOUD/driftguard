import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Footer } from "@/components/landing/Footer";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Documentation — DriftGuard",
    description: "DriftGuard documentation: install guide, API reference, core concepts, integrations, and compliance controls.",
    path: "/docs",
    keywords: ["DriftGuard docs", "Terraform PR review docs", "infrastructure as code review"],
  }),
};

const SECTIONS = [
  {
    label: "Get started",
    items: [
      { t: "Install the GitHub App", h: "/docs/install", desc: "30s install on any GitHub org" },
      { t: "Your first PR review", h: "/docs/first-review", desc: "Open a Terraform PR, get a review" },
      { t: "Configure policies", h: "/docs/policies", desc: "OPA/Rego policy bundles per repo" },
    ],
  },
  {
    label: "Core concepts",
    items: [
      { t: "Semantic memory", h: "/docs/memory", desc: "How DriftGuard remembers failures" },
      { t: "Drift detection", h: "/docs/drift", desc: "State diff between plan and live" },
      { t: "Cost analysis", h: "/docs/cost", desc: "Infracost integration & thresholds" },
      { t: "Security scanning", h: "/docs/security", desc: "Checkov + AI triage" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { t: "DORA evidence", h: "/docs/dora", desc: "EU Digital Operational Resilience Act" },
      { t: "NIS2", h: "/docs/nis2", desc: "Network and Information Systems directive" },
      { t: "ISO 27001 controls", h: "/docs/iso-27001", desc: "Annex A control mapping" },
      { t: "Audit log", h: "/docs/audit", desc: "Signed, append-only event stream" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { t: "AWS", h: "/docs/aws", desc: "STS AssumeRole + S3 state backend" },
      { t: "GCP", h: "/docs/gcp", desc: "Workload Identity Federation" },
      { t: "Azure", h: "/docs/azure", desc: "Federated workload identity" },
      { t: "Slack alerts", h: "/docs/slack", desc: "Channel routing per severity" },
    ],
  },
  {
    label: "Deploy",
    items: [
      { t: "Self-hosted", h: "/docs/self-host", desc: "Helm chart + container images" },
      { t: "Cloud Run", h: "/docs/cloud-run", desc: "Reference GCP deployment" },
      { t: "Environment variables", h: "/docs/env", desc: "Full reference" },
    ],
  },
  {
    label: "API",
    items: [
      { t: "REST reference", h: "/docs/api", desc: "All endpoints, authentication, examples" },
      { t: "Webhooks", h: "/docs/webhooks", desc: "Outbound events for incident integration" },
      { t: "Rate limits", h: "/docs/rate-limits", desc: "Per-org and per-API-key quotas" },
    ],
  },
];

const QUICKSTART = `# 1. Install the GitHub App on your org
$ open https://github.com/apps/driftguard-app/installations/new

# 2. Add .github/driftguard.yml to your repo
policy:
  block: [aws_rds_cluster.*.delete]
  warn: [aws_security_group.ingress.0.0.0.0/0]
compliance:
  frameworks: [DORA, NIS2, ISO27001]

# 3. Open a PR — DriftGuard comments with cost, security, compliance.`;

export default async function DocsPage() {
  const session = await auth();
  return (
    <main className="relative min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      <StatusBar />
      <MarketingNav
        isLoggedIn={!!session}
        cta={
          !session ? (
            <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
              Get started
            </SignInButton>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl">
          <div className="dg-label">Documentation</div>
          <h1 className="mt-3 font-sans text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            Build, deploy, and operate DriftGuard.
          </h1>
          <p className="mt-4 text-[15px] text-[color:var(--dg-fg-muted)]">
            Everything you need to wire DriftGuard into your Terraform pipeline and AI agent workflows.
          </p>
        </div>

        <div className="mt-10 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5 flex items-center justify-between">
            <div className="dg-label">▸ quickstart</div>
            <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">~30s</div>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[color:var(--dg-fg)]">{QUICKSTART}</pre>
          <div className="border-t border-[color:var(--dg-border)] px-4 py-2.5 flex items-center justify-between font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
            <span>config.driftguard.yml ▪ committed to repo</span>
            <a href="https://github.com/apps/driftguard-app/installations/new" className="text-[color:var(--dg-electric-bright)] hover:underline">▸ install now</a>
          </div>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.label}>
              <div className="dg-label flex items-center gap-2 mb-4">
                <span className="h-px w-4 bg-[color:var(--dg-electric)]" />
                {s.label}
              </div>
              <ul className="space-y-1">
                {s.items.map((i) => (
                  <li key={i.t}>
                    <Link
                      href={i.h}
                      className="group block rounded border border-transparent hover:border-[color:var(--dg-border)] hover:bg-[color:var(--dg-surface)] px-3 py-2.5 -mx-3 transition"
                    >
                      <div className="text-[13.5px] font-medium text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition flex items-center gap-2">
                        {i.t}
                        <span className="opacity-0 group-hover:opacity-100 transition text-[color:var(--dg-fg-subtle)]">→</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[color:var(--dg-fg-muted)]">{i.desc}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
          <div>
            <div className="dg-label">Need a human?</div>
            <p className="mt-2 text-[14px] text-[color:var(--dg-fg-muted)] max-w-md">
              We&apos;re a small team. Email us — we reply in &lt; 24h on weekdays.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="mailto:support@driftguard.io" className="dg-button dg-button-ghost text-[12px]">
              support@driftguard.io
            </a>
            <a href="https://github.com/UP2CLOUD/driftguard/issues" target="_blank" rel="noreferrer" className="dg-button dg-button-primary text-[12px]">
              GitHub issues →
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
