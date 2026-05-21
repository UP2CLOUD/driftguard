import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers — DriftGuard",
  description: "How platform and infrastructure teams use DriftGuard to ship safer Terraform.",
};

const QUOTES = [
  {
    quote: "Our agents were opening Terraform PRs that would silently delete production RDS clusters. DriftGuard blocks those before merge with a risk score and a PR comment explaining exactly why.",
    author: "Platform Engineering Lead",
    company: "Series B fintech · EU",
    tags: ["AWS", "AI agents", "Drift detection"],
    metric: { label: "incidents prevented", value: "23" },
  },
  {
    quote: "The compliance evidence alone saved us three weeks of audit prep. NIS2 and ISO 27001 controls are now a side effect of our normal deploy process — not a separate checklist.",
    author: "Head of Security",
    company: "SaaS infrastructure provider · DE",
    tags: ["NIS2", "ISO 27001", "Compliance"],
    metric: { label: "audit prep hours saved", value: "120" },
  },
  {
    quote: "We tried Infracost standalone but the noise-to-signal ratio was too high. DriftGuard's AI triage means we only see findings that actually affect cost or production risk.",
    author: "Staff Engineer",
    company: "E-commerce platform · PT",
    tags: ["FinOps", "Security", "Terraform"],
    metric: { label: "cost waste identified/mo", value: "€4,200" },
  },
  {
    quote: "The semantic memory is what makes it different. It cited a past incident where the same S3 ACL change caused a data exposure. The team actually read it.",
    author: "SRE Lead",
    company: "Developer tooling company · NL",
    tags: ["Memory", "Security", "OpenTofu"],
    metric: { label: "repeat incidents", value: "0" },
  },
] as const;

const STATS = [
  { value: "4.2k+", label: "PR reviews" },
  { value: "99.1%", label: "Uptime" },
  { value: "18s", label: "P50 review time" },
  { value: "€0", label: "False positive cost" },
] as const;

export default function Customers() {
  return (
    <MarketingPageShell
      eyebrow="Customers"
      title="Trusted by infrastructure teams"
      subtitle="From Series A startups to enterprise platform teams. Across AWS, GCP, and hybrid environments."
    >
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-14">
        {STATS.map(({ value, label }) => (
          <div key={label} className="bg-[color:var(--dg-canvas)] px-5 py-6 text-center">
            <div className="font-mono text-2xl font-bold tabular-nums text-[color:var(--dg-fg)]">{value}</div>
            <div className="dg-label mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Quotes */}
      <div className="grid gap-5 sm:grid-cols-2">
        {QUOTES.map((q) => (
          <div
            key={q.author}
            className="flex flex-col rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden"
          >
            {/* Metric banner */}
            <div className="flex items-center gap-3 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-5 py-3">
              <span className="font-mono text-xl font-bold tabular-nums text-allowed">
                {q.metric.value}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {q.metric.label}
              </span>
            </div>

            <div className="flex-1 p-5">
              <blockquote className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-5">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
              <div className="mt-auto">
                <div className="text-[12px] font-semibold text-[color:var(--dg-fg)]">{q.author}</div>
                <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">{q.company}</div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {q.tags.map((tag) => (
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
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/5 p-8 text-center">
        <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-2">
          Want to be here?
        </h2>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] mb-5">
          Install the GitHub App in 30 seconds. No credit card.
        </p>
        <a
          href="https://github.com/apps/driftguard-app/installations/new"
          target="_blank"
          rel="noreferrer"
          className="dg-button dg-button-primary text-[13px]"
        >
          Install DriftGuard →
        </a>
      </div>
    </MarketingPageShell>
  );
}
