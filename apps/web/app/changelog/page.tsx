import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog — DriftGuard" };

const ENTRIES = [
  {
    version: "v0.1.4",
    date: "2026-05-19",
    tag: "improvement",
    title: "Semantic memory recall in PR comments",
    body: "When DriftGuard finds a past incident with similarity ≥ 0.85, it now links directly to the original PR in the GitHub comment. Shows similarity score, blast radius, and date of the prior failure.",
    items: [
      "Cited incidents sorted by similarity desc",
      "Direct GitHub PR deep-link in comment",
      "Similarity score displayed as badge (0.00–1.00)",
    ],
  },
  {
    version: "v0.1.3",
    date: "2026-05-12",
    tag: "fix",
    title: "Cost delta format for EUR/GBP/BRL",
    body: "Currency formatting now respects the workspace locale preference. Previously all deltas were displayed in USD regardless of preference setting.",
    items: [
      "formatCostDeltaCents now locale-aware",
      "Preference persisted per org, not per session",
    ],
  },
  {
    version: "v0.1.2",
    date: "2026-05-05",
    tag: "new",
    title: "AWS STS integration",
    body: "Platform teams can now grant DriftGuard read-only access to their AWS account via STS AssumeRole. DriftGuard fetches live state from S3 backends to power drift detection — no credentials stored.",
    items: [
      "Terraform customer-iam module for role provisioning",
      "External ID condition on AssumeRole",
      "S3 state backend read for drift diff",
      "Works with Atlantis and Spacelift self-hosted state",
    ],
  },
  {
    version: "v0.1.1",
    date: "2026-04-28",
    tag: "improvement",
    title: "GitHub App install flow",
    body: "Setup URL now redirects directly to /dashboard/{installationId} after GitHub App installation, removing the intermediate 'Install the GitHub App' screen.",
    items: [
      "api/github/setup route captures installation_id",
      "Redirect on update enabled for re-installs",
      "No longer requires OAuth token to list installations",
    ],
  },
  {
    version: "v0.1.0",
    date: "2026-04-14",
    tag: "launch",
    title: "Initial beta",
    body: "First beta release. Terraform and OpenTofu PR review via GitHub App. Cost analysis (Infracost), security scanning (Checkov), drift detection, semantic memory, DORA/NIS2/ISO 27001 compliance evidence.",
    items: [
      "GitHub App with PR comment",
      "14 API routes (FastAPI)",
      "48 unit tests, 10 eval cases",
      "Multi-tenant with per-org memory isolation",
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  new: "text-allowed border-allowed/30 bg-allowed/10",
  improvement: "text-[color:var(--dg-electric-bright)] border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10",
  fix: "text-warned border-warned/30 bg-warned/10",
  launch: "text-[#a78bfa] border-[#7c3aed]/30 bg-[#7c3aed]/10",
};

export default function Changelog() {
  return (
    <MarketingPageShell
      eyebrow="Changelog"
      title="What's new in DriftGuard"
      subtitle="Release notes for every version. Subscribe to GitHub releases for notifications."
      narrow
    >
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-[color:var(--dg-border)]" />
        <div className="space-y-12">
          {ENTRIES.map((e) => (
            <div key={e.version} className="relative pl-8">
              <span className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border border-[color:var(--dg-electric)] bg-[color:var(--dg-canvas)]" />
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono text-[13px] font-semibold text-[color:var(--dg-fg)]">{e.version}</span>
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${TAG_STYLES[e.tag] || ""}`}>{e.tag}</span>
                <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] tabular-nums">{e.date}</span>
              </div>
              <h2 className="text-[17px] font-semibold tracking-tight text-[color:var(--dg-fg)] mb-2">{e.title}</h2>
              <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-4">{e.body}</p>
              <ul className="space-y-1.5">
                {e.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12px] text-[color:var(--dg-fg-muted)]">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[color:var(--dg-electric)] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </MarketingPageShell>
  );
}
