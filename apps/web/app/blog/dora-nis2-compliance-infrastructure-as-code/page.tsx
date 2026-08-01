import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { JsonLd } from "@/components/JsonLd";
import { blogPostMeta, jsonLdBreadcrumb, jsonLdArticle } from "@/lib/seo";
import { getBlogPost } from "@/lib/blog";
import { ArticleSection, ArticleList } from "@/components/blog/ArticleSection";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

const POST = getBlogPost("dora-nis2-compliance-infrastructure-as-code")!;

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        `/blog/${POST.slug}`,
    title:       `${POST.title} | DriftGuard`,
    description: POST.description,
    keywords:    ["DORA compliance infrastructure as code", "NIS2 IaC compliance", "terraform compliance evidence", "DORA ICT risk management", "NIS2 change management"],
    publishedAt: POST.publishedAt,
    modifiedAt:  POST.publishedAt,
  });
}

export default function DoraNis2ComplianceGuide() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: POST.title, path: `/blog/${POST.slug}` },
      ])}
      eyebrow="Blog · Compliance"
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
            DORA (the EU Digital Operational Resilience Act) and NIS2 (the Network and Information Systems directive) both ask
            regulated organisations to manage ICT risk with &quot;appropriate and proportionate technical measures,&quot; and both
            expect evidence, not just a policy document. For teams running infrastructure on Terraform, the practical question is:
            which pull request checks actually satisfy an auditor, and how do you produce evidence for them without a separate
            compliance project on top of your existing pipeline?
          </p>
        </ArticleSection>

        <ArticleSection title="What auditors are actually asking for">
          <p>
            Both frameworks converge on the same underlying controls, even though the legal text differs:
          </p>
          <ArticleList
            items={[
              <>
                <strong className="text-[color:var(--dg-fg)]">Change management</strong> — every infrastructure change went
                through a controlled, reviewed process, not an ad-hoc console edit.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">ICT risk assessment</strong> — changes were checked against known
                risk categories (misconfiguration, exposure, access control) before they went live.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Resilience / operational continuity</strong> — the actual running
                state of infrastructure matches what was approved, so nothing has quietly drifted into a riskier configuration.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Incident linkage</strong> — when something does go wrong, there&apos;s
                a record connecting the incident back to the change (or drift) that caused it.
              </>,
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Mapping Terraform PR checks to DORA">
          <p>
            DORA&apos;s change-management and ICT-risk articles are satisfied by gating every infrastructure pull request through
            the same review pipeline, rather than a separate compliance-only process:
          </p>
          <ArticleList
            items={[
              "A Checkov security misconfiguration scan plus a policy gate runs on every change — this is your ICT risk assessment, evidenced per PR instead of per quarterly audit.",
              "Live-state drift detection proves the Terraform plan matches the real infrastructure before merge — this is the resilience/continuity control, checked continuously instead of sampled.",
              "Semantic recall surfaces prior incidents linked to the same resources at review time — this is the incident-linkage control, made visible to the reviewer instead of buried in a ticketing system.",
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Mapping Terraform PR checks to NIS2">
          <p>
            NIS2 Article 21 requires &quot;appropriate and proportionate technical measures&quot; to manage risk — deliberately
            broad language, which in practice means auditors look for consistent, enforced controls rather than a specific tool:
          </p>
          <ArticleList
            items={[
              "Checkov plus the policy engine flag misconfigurations before merge — the technical risk-management measure.",
              "A required GitHub Check gates merges, and drift detection blocks stale plans from being approved against — the enforcement measure that makes the control non-optional.",
              "An audit log records every decision (allowed, blocked, overridden) for later assessment — the accountability measure.",
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Evidence, not just checks">
          <p>
            Passing a check is not the same as being able to prove, months later, that the check ran and what it found. Each
            pull request should produce a signed evidence record — the finding, the resource affected, the outcome (blocked or
            allowed), and a reference to which compliance article it maps to — so an audit becomes &quot;export the evidence log for
            this period&quot; instead of &quot;reconstruct what happened from Slack and Git history.&quot; See the{" "}
            <Link href="/docs/dora" className="text-[color:var(--dg-electric-bright)] hover:underline">DORA evidence docs</Link>{" "}
            and <Link href="/docs/nis2" className="text-[color:var(--dg-electric-bright)] hover:underline">NIS2 compliance docs</Link>{" "}
            for the config that turns this on.
          </p>
        </ArticleSection>

        <ArticleSection title="This doesn't replace a compliance program">
          <p>
            Automated PR-time checks satisfy the technical-control layer of DORA and NIS2 — they don&apos;t substitute for the
            governance layer: risk registers, third-party risk assessments, incident reporting to regulators, and the rest of
            what a compliance program actually requires. Treat this as making the infrastructure-change portion of that program
            evidence-complete by default, not as compliance-in-a-box.
          </p>
        </ArticleSection>
      </div>

      <div className="mt-14 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 text-center sm:p-8">
        <p className="mb-4 text-[15px] font-medium text-[color:var(--dg-fg)]">
          See DORA and NIS2 evidence generated automatically on your own Terraform pull requests.
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
            href="/compliance"
            className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            See compliance overview
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
