import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { JsonLd } from "@/components/JsonLd";
import { blogPostMeta, jsonLdBreadcrumb, jsonLdArticle } from "@/lib/seo";
import { getBlogPost, getRelatedPosts } from "@/lib/blog";
import { ArticleSection, ArticleCode, ArticleList } from "@/components/blog/ArticleSection";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

const POST = getBlogPost("terraform-cost-security-guardrails-cicd")!;

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        `/blog/${POST.slug}`,
    title:       `${POST.seoTitle} | DriftGuard`,
    description: POST.description,
    keywords:    ["terraform cost estimation ci", "infracost terraform", "checkov terraform ci/cd", "terraform security scanning pipeline", "policy as code terraform"],
    publishedAt: POST.publishedAt,
    modifiedAt:  POST.publishedAt,
  });
}

export default function TerraformGuardrailsCicd() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: POST.title, path: `/blog/${POST.slug}` },
      ])}
      eyebrow="Blog · CI/CD"
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
        <ArticleSection title="Why gate at the pull request, not after merge">
          <p>
            Most teams find out a Terraform change was expensive or insecure one of two ways: the cloud bill spikes at the end of
            the month, or a security scanner run days later flags something already live. Both are the same mistake — checking cost
            and security after the infrastructure exists instead of before it&apos;s created. Every guardrail in this post runs at
            pull-request time, when a resource is still a plan, not a running bill.
          </p>
        </ArticleSection>

        <ArticleSection title="1. Cost estimation with Infracost">
          <p>
            Infracost reads a Terraform plan&apos;s JSON output and prices every resource in it against current cloud pricing, then
            reports the monthly delta. Wired into CI, it turns &quot;this PR adds infrastructure&quot; into &quot;this PR adds
            €340/month,&quot; attached to the diff instead of discovered a billing cycle later.
          </p>
          <ArticleCode>{`# minimal CI step
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json
infracost breakdown --path plan.json --format json > infracost.json`}</ArticleCode>
          <p>
            The output alone isn&apos;t a guardrail until it has a threshold attached — otherwise it&apos;s a number nobody acts on.
            Set both a warn and a block level:
          </p>
          <ArticleCode>{`# .github/driftguard.yml
cost:
  currency: USD
  warn_above_monthly_delta: 100
  block_above_monthly_delta: 1000`}</ArticleCode>
          <p>
            Exchange rates matter if your team reports in a non-USD currency — fetch them daily rather than hardcoding a rate that
            drifts (ironically) out of date. See the <Link href="/docs/cost" className="text-[color:var(--dg-electric-bright)] hover:underline">cost analysis docs</Link>{" "}
            for the full config.
          </p>
        </ArticleSection>

        <ArticleSection title="2. Static security analysis with Checkov">
          <p>
            Checkov scans Terraform (and CloudFormation, Kubernetes manifests, and more) against a large library of policy checks —
            public storage buckets, security groups open to the world, unencrypted volumes, overly broad IAM. It&apos;s deterministic
            and fast enough to run on every PR without slowing the pipeline down.
          </p>
          <ArticleCode>{`# minimal CI step
checkov -d . --framework terraform --compact --quiet`}</ArticleCode>
          <p>
            Static rules catch known-bad patterns reliably but miss context-dependent issues — an IAM policy that&apos;s technically
            valid but broader than the service actually needs, for instance. Pair static analysis with a human reading any IAM or
            network-boundary diff; don&apos;t rely on it as the only check on access changes.
          </p>
        </ArticleSection>

        <ArticleSection title="3. Policy-as-code for team-specific rules">
          <p>
            Cost thresholds and security scanners cover the general case. Policy is where you encode what&apos;s specific to your
            org — which resource types need a second approval, which environments are locked down, which teams own which blast
            radius. Simple deny/warn glob patterns cover most of this:
          </p>
          <ArticleCode>{`# .github/driftguard.yml
policy:
  block:
    - "aws_db_instance.*.publicly_accessible"
    - "aws_iam_policy.*"
  warn:
    - "aws_instance.*.instance_type"`}</ArticleCode>
          <p>
            Patterns are evaluated against every resource change in the Terraform plan; wildcards match any value. For rules that
            need real logic — multi-environment policies, team-based ownership, time-based restrictions (no production changes
            after 5pm Friday) — a full OPA/Rego policy bundle handles it. See the{" "}
            <Link href="/docs/policies" className="text-[color:var(--dg-electric-bright)] hover:underline">policy engine docs</Link>.
          </p>
        </ArticleSection>

        <ArticleSection title="4. Least-privilege credentials for the pipeline itself">
          <p>
            A guardrail that needs a long-lived cloud key to run is itself a security liability. Cost and drift checks that read
            live infrastructure state should use short-lived, read-only credentials — AWS STS <code className="font-mono text-[color:var(--dg-electric-bright)]">AssumeRole</code>,
            GCP Workload Identity Federation, or Azure federated workload identity — scoped to read-only, issued per run, and never
            stored. If a pipeline step only needs the plan JSON (cost, static security), it doesn&apos;t need cloud credentials at all.
          </p>
        </ArticleSection>

        <ArticleSection title="Putting it together">
          <p>A pull-request pipeline with all three guardrails, roughly in the order that fails fastest first:</p>
          <ArticleList
            items={[
              "terraform plan → generate the plan JSON everything else reads from.",
              "Checkov → static security scan, blocks on high severity.",
              "Infracost → cost delta, warns or blocks on your configured thresholds.",
              "Policy check → team-specific block/warn rules against the plan diff.",
              "Drift check (if a cloud role is connected) → compare live resource state against the plan's starting assumptions.",
            ]}
          />
          <p>
            Each step is independently useful; together, they replace &quot;we found out after merge&quot; with &quot;we found out
            before anyone approved it.&quot;
          </p>
        </ArticleSection>
      </div>

      <RelatedArticles posts={getRelatedPosts(POST)} />

      <div className="mt-14 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 text-center sm:p-8">
        <p className="mb-4 text-[15px] font-medium text-[color:var(--dg-fg)]">
          DriftGuard runs cost, security, policy, and drift checks on every Terraform PR out of the box — no pipeline YAML to assemble.
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
            href="/pricing"
            className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            See pricing
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
