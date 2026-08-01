import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { JsonLd } from "@/components/JsonLd";
import { blogPostMeta, jsonLdBreadcrumb, jsonLdArticle } from "@/lib/seo";
import { getBlogPost, getRelatedPosts } from "@/lib/blog";
import { ArticleSection, ArticleCode, ArticleList } from "@/components/blog/ArticleSection";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

const POST = getBlogPost("terraform-pull-request-review-checklist")!;

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        `/blog/${POST.slug}`,
    title:       `${POST.seoTitle} | DriftGuard`,
    description: POST.description,
    keywords:    ["terraform pull request review", "terraform code review checklist", "terraform PR checklist", "infrastructure as code review"],
    publishedAt: POST.publishedAt,
    modifiedAt:  POST.publishedAt,
  });
}

export default function TerraformPrChecklist() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: POST.title, path: `/blog/${POST.slug}` },
      ])}
      eyebrow="Blog · PR review"
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
            A Terraform pull request looks like any other code review — a diff, some comments, an approve button — but the blast
            radius is different. A bad application code review ships a bug. A bad Terraform review can delete a database, open a
            security group to the world, or triple a cloud bill overnight. Reviewing a Terraform diff line-by-line for logic errors
            catches typos; it does not catch drift, cost, or a misconfigured IAM policy, because none of those are visible in the raw
            HCL diff. This checklist is what to actually check.
          </p>
        </ArticleSection>

        <ArticleSection title="1. Drift — is the starting state what you think it is?">
          <p>
            Before reviewing what a PR changes, confirm the resources it touches haven&apos;t already drifted from Terraform&apos;s
            record of them. A plan generated against a stale state file can look clean and still be wrong, because it&apos;s
            comparing against a version of reality that no longer exists.
          </p>
          <ArticleList
            items={[
              "Check whether any resource in this diff has drifted since the last apply.",
              "If drift is present, resolve it (reconcile or reimport) before reviewing the new change on top of it.",
              <>See <Link href="/blog/terraform-drift-detection-guide" className="text-[color:var(--dg-electric-bright)] hover:underline">our drift detection guide</Link> for detection methods.</>,
            ]}
          />
        </ArticleSection>

        <ArticleSection title="2. Cost — what does this change actually cost per month?">
          <p>
            A resource diff doesn&apos;t tell you cost impact at a glance — an instance type bump, an added NAT gateway, or a
            provisioned-throughput change on a database can each add hundreds of dollars a month, and none of them look alarming in
            a plain <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> diff.
          </p>
          <ArticleList
            items={[
              "Run the diff through a cost estimator (Infracost or equivalent) and read the monthly delta per resource, not just the total.",
              "Set an explicit warn/block threshold so a large delta needs a second look, instead of relying on someone noticing.",
              "Watch for resources that don't show a cost line at all — usage-based pricing (data transfer, request volume) often needs a manual sanity check.",
            ]}
          />
          <p>Example threshold config:</p>
          <ArticleCode>{`# .github/driftguard.yml
cost:
  currency: USD
  warn_above_monthly_delta: 100
  block_above_monthly_delta: 1000`}</ArticleCode>
        </ArticleSection>

        <ArticleSection title="3. Security — static analysis plus a human sanity check">
          <p>
            Static analysis (Checkov, tfsec, or similar) catches the categories that recur constantly: public S3 buckets, security
            groups open to 0.0.0.0/0, unencrypted volumes, IAM policies with wildcard resources. Run it on every PR, not periodically —
            a rule that only fires in a weekly scan finds the misconfiguration a week after it&apos;s already live.
          </p>
          <ArticleList
            items={[
              "Static analysis on every PR, blocking on high-severity findings by default.",
              "A human still reads the IAM diff — static rules catch known bad patterns, not \"this role has broader access than this service needs.\"",
              "Least-privilege for the reviewing tool itself: whatever reads your live cloud state to check drift or security should use short-lived, read-only credentials — AWS STS AssumeRole, GCP Workload Identity Federation, or Azure federated workload identity — never long-lived keys.",
            ]}
          />
        </ArticleSection>

        <ArticleSection title="4. Policy — is this change something your team is actually allowed to make?">
          <p>
            Cost and security tools catch known bad patterns. Policy is different: it&apos;s your team&apos;s own rules about what
            can change, encoded so they&apos;re enforced instead of just written in a wiki page nobody reads before merging.
          </p>
          <ArticleCode>{`# .github/driftguard.yml
policy:
  block:
    - "aws_db_instance.*.publicly_accessible"
    - "aws_iam_policy.*"  # require manual approval on any IAM policy change
  warn:
    - "aws_instance.*.instance_type"`}</ArticleCode>
          <p>
            Simple glob patterns cover most teams. For multi-environment rules, team-based access, or time-based restrictions, a full
            OPA/Rego policy bundle gives you the same enforcement with more expressive logic — see the{" "}
            <Link href="/docs/policies" className="text-[color:var(--dg-electric-bright)] hover:underline">policy engine docs</Link>.
          </p>
        </ArticleSection>

        <ArticleSection title="5. Precedent — has something like this broken before?">
          <p>
            The most useful signal in a review is often: &quot;we changed something like this six months ago and it caused an
            incident.&quot; That context usually lives in someone&apos;s memory, not in the PR. Attaching similar past findings —
            same resource type, same kind of change, same blast radius — directly to the review turns institutional memory into
            something every reviewer sees, not just whoever happened to be on call last time.
          </p>
        </ArticleSection>

        <ArticleSection title="The checklist">
          <ArticleList
            items={[
              "No drift on any resource this PR touches, or drift is resolved first.",
              "Monthly cost delta reviewed, not just the plan diff.",
              "Static security analysis passed (or high-severity findings explicitly acknowledged).",
              "Change matches your team's policy — no blocked patterns, warnings addressed.",
              "Checked against past incidents on the same resource type or blast radius.",
              "IAM / access changes read by a human, not just a linter.",
            ]}
          />
        </ArticleSection>
      </div>

      <RelatedArticles posts={getRelatedPosts(POST)} />

      <div className="mt-14 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 text-center sm:p-8">
        <p className="mb-4 text-[15px] font-medium text-[color:var(--dg-fg)]">
          DriftGuard runs this whole checklist automatically on every Terraform pull request.
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
            href="/docs/first-review"
            className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            See your first review
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
