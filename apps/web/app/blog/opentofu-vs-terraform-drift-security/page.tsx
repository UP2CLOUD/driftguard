import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { JsonLd } from "@/components/JsonLd";
import { blogPostMeta, jsonLdBreadcrumb, jsonLdArticle } from "@/lib/seo";
import { getBlogPost } from "@/lib/blog";
import { ArticleSection, ArticleList } from "@/components/blog/ArticleSection";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

const POST = getBlogPost("opentofu-vs-terraform-drift-security")!;

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        `/blog/${POST.slug}`,
    title:       `${POST.title} | DriftGuard`,
    description: POST.description,
    keywords:    ["opentofu vs terraform", "opentofu drift detection", "opentofu security scanning", "terraform to opentofu migration"],
    publishedAt: POST.publishedAt,
    modifiedAt:  POST.publishedAt,
  });
}

export default function OpenTofuVsTerraform() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: POST.title, path: `/blog/${POST.slug}` },
      ])}
      eyebrow="Blog · Tooling"
      title={POST.title}
      subtitle={POST.description}
      narrow
    >
      <JsonLd
        data={jsonLdArticle({
          title:         POST.title,
          description:   POST.description,
          path:          `/blog/${POST.slug}`,
          locale:        "en",
          datePublished: POST.publishedAt,
          dateModified:  POST.publishedAt,
        })}
      />

      <div className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
        <time dateTime={POST.publishedAt}>{POST.publishedAt}</time>
        <span aria-hidden="true">·</span>
        <span>{POST.readTime}</span>
      </div>

      <div className="space-y-10 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <ArticleSection>
          <p>
            OpenTofu forked from Terraform&apos;s open-source codebase in 2023 and has stayed close to it since — same HCL syntax,
            same plan/apply/state model, same provider ecosystem for the most part. For teams evaluating a move, or running both
            side by side during a migration, the useful question isn&apos;t &quot;which is better&quot; in the abstract — it&apos;s
            specifically what changes for drift detection, security scanning, and cost tooling, since those are what most teams
            actually have wired into CI.
          </p>
        </ArticleSection>

        <ArticleSection title="What stays the same">
          <ArticleList
            items={[
              <>
                <strong className="text-[color:var(--dg-fg)]">The plan/state model.</strong> OpenTofu&apos;s state file format
                and <code className="font-mono text-[color:var(--dg-electric-bright)]">plan</code>/<code className="font-mono text-[color:var(--dg-electric-bright)]">apply</code> lifecycle
                are unchanged from Terraform, so any drift-detection approach that reads plan JSON or compares state against live
                resources works the same way against either.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Provider compatibility.</strong> OpenTofu consumes the same provider
                binaries as Terraform for the vast majority of providers, so resource-level security scanning (Checkov, tfsec-style
                rule sets) doesn&apos;t need a separate ruleset — it&apos;s scanning the same HCL either way.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Cost estimation.</strong> Tools that price a plan&apos;s resource
                diff (Infracost and similar) read the same plan JSON structure, so cost guardrails carry over without changes.
              </>,
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Where they diverge">
          <ArticleList
            items={[
              <>
                <strong className="text-[color:var(--dg-fg)]">License and registry.</strong> OpenTofu is Linux Foundation-governed
                and MPL 2.0 licensed; Terraform moved to BSL (Business Source License) in 2023. This doesn&apos;t affect drift or
                security tooling directly, but it&apos;s the reason many teams are migrating in the first place — worth confirming
                any third-party tool you depend on explicitly supports OpenTofu, not just &quot;Terraform-compatible&quot; by
                assumption.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">New OpenTofu-only features</strong> (state encryption, provider
                iteration via <code className="font-mono text-[color:var(--dg-electric-bright)]">for_each</code> on providers, and
                others added post-fork) don&apos;t exist in Terraform. If your security or drift tooling parses state files
                directly rather than going through the CLI, confirm it handles OpenTofu&apos;s native state encryption format if
                you enable it.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">CLI binary and registry URLs</strong> differ (<code className="font-mono text-[color:var(--dg-electric-bright)]">tofu</code> vs{" "}
                <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform</code>, separate module registry) —
                a purely mechanical difference, but one that breaks any CI step hardcoding the Terraform binary name.
              </>,
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Before migrating: a short checklist">
          <ArticleList
            items={[
              "Confirm every provider your workspace uses is published for OpenTofu's registry (nearly all major providers are, but check any niche/internal ones).",
              "Confirm your drift-detection and security-scanning tools explicitly list OpenTofu support, not just \"reads HCL\" — plan JSON schema is compatible today but isn't contractually guaranteed to stay identical forever.",
              "If you use remote state encryption, verify your tooling reads OpenTofu's native encryption rather than requiring you to disable it.",
              "Update CI scripts that reference the terraform binary name directly.",
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Running both">
          <p>
            Most teams don&apos;t cut over in one step — they run OpenTofu on new workspaces while existing Terraform workspaces
            stay put until a natural migration point. Tooling that treats drift detection, cost, and security scanning as
            plan-JSON-in, findings-out — rather than hardcoding assumptions about which binary produced the plan — handles both
            without extra configuration. That&apos;s the approach DriftGuard takes: the same checks run against Terraform and
            OpenTofu pull requests without a separate setup path.
          </p>
        </ArticleSection>
      </div>

      <div className="mt-14 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 text-center sm:p-8">
        <p className="mb-4 text-[15px] font-medium text-[color:var(--dg-fg)]">
          DriftGuard reviews Terraform and OpenTofu pull requests with the same drift, cost, and security checks.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={getGitHubAppInstallUrl()}
            target="_blank"
            rel="noreferrer"
            className="touch-manipulation inline-block rounded bg-[color:var(--dg-electric)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.97]"
          >
            Install the GitHub App
          </a>
          <Link
            href="/docs/install"
            className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            Read the install guide
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
