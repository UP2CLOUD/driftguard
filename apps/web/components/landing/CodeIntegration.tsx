"use client";

import { useT } from "@/components/TranslationProvider";

import { useState, useCallback } from "react";
import { SectionHeader } from "./Architecture";

const SAMPLES = {
  github: `# .github/driftguard.yml
# DriftGuard config — committed to your repo

policy:
  blast_radius: prod
  block:
    - aws_rds_cluster.*.delete
    - aws_iam_policy.*.resources=*
  warn:
    - aws_security_group.ingress.0.0.0.0/0

memory:
  retention: 365d
  cite_in_pr: true     # cite past incidents in PR comments

compliance:
  frameworks: [DORA, NIS2, ISO27001]
  evidence: ./compliance/evidence

cost:
  threshold_monthly_usd: 500
  block_above: 5000`,

  cli: `# Add to .github/workflows/terraform.yml
# DriftGuard posts results as GitHub Check Runs automatically.
# No workflow changes needed — install the app and it just works.

# Optional: fail CI explicitly on DriftGuard block
name: Terraform
on: [pull_request]
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init && terraform plan

# DriftGuard reads the plan output via the PR event webhook.
# The GitHub Check Run blocks merge when risk_score >= 70.
# Configure thresholds in .github/driftguard.yml per repo.`,

  rest: `# Query past incidents semantically
POST https://api.driftguard.io/v1/memory/recall
Authorization: Bearer $DG_API_KEY
Content-Type: application/json

{
  "project": "acme-platform",
  "intent": "delete aws_rds_cluster in prod",
  "top_k": 5
}

# Response
HTTP/1.1 200 OK
{
  "matches": [
    {
      "id": "evt_8x2m",
      "similarity": 0.94,
      "date": "2026-04-22",
      "summary": "RDS deletion blocked by drift detector",
      "blast_radius": "prod",
      "resource": "aws_rds_cluster.prod"
    }
  ],
  "latency_ms": 9
}`,
};

type Lang = keyof typeof SAMPLES;

export function CodeIntegration() {
  const t = useT();
  const [lang, setLang] = useState<Lang>("github");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(SAMPLES[lang]).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <section id="integrate" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <SectionHeader
          eyebrow="Integrate"
          title={t("landing.codeIntegration.title")}
          subtitle="GitHub App + repo config. No SDK, no rewrites, no infrastructure changes. Optional CLI for local pre-flight."
        />

        <div className="mt-12 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]">
            <div className="flex">
              {(Object.keys(SAMPLES) as Lang[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setLang(k)}
                  className={`relative px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition
                    ${lang === k
                      ? "text-[color:var(--dg-fg)]"
                      : "text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg-muted)]"
                    }`}
                >
                  {k}
                  {lang === k && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[color:var(--dg-electric)]" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="mr-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              {copied ? "✓ copied" : "▸ copy"}
            </button>
          </div>

          {/* Code body */}
          <div className="relative">
            <pre key={lang} className="dg-tab-panel overflow-x-auto p-4 sm:p-6 font-mono text-[11px] sm:text-[13px] leading-relaxed text-[color:var(--dg-fg)]">
              <code>{SAMPLES[lang]}</code>
            </pre>
            {/* Line numbers gutter */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 border-r border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]/40" />
          </div>

          {/* Bottom strip */}
          <div className="flex items-center justify-between border-t border-[color:var(--dg-border)] px-4 py-2 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
            <span>sdk.driftguard.io ▪ semver 0.4.2 ▪ {SAMPLES[lang].split("\n").length} lines</span>
            <a href="/docs" className="text-[color:var(--dg-electric-bright)] hover:underline">▸ full docs</a>
          </div>
        </div>

        {/* Sub-CTA: framework chips */}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="dg-label">{t("landing.codeIntegration.worksWith")}</span>
          {["Terraform", "OpenTofu", "Terragrunt", "Atlantis", "Spacelift", "Cursor", "Devin", "Claude Code"].map((f) => (
            <span
              key={f}
              className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/60 px-2 py-1 font-mono text-[10px] text-[color:var(--dg-fg-muted)] hover:border-[color:var(--dg-border-bright)] hover:text-[color:var(--dg-fg)] transition cursor-default"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
