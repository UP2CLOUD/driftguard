import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { JsonLd } from "@/components/JsonLd";
import { blogPostMeta, jsonLdBreadcrumb, jsonLdArticle, jsonLdFaq } from "@/lib/seo";
import { getBlogPost } from "@/lib/blog";
import { ArticleSection, ArticleCode, ArticleList } from "@/components/blog/ArticleSection";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

const POST = getBlogPost("terraform-drift-detection-guide")!;

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        `/blog/${POST.slug}`,
    title:       `${POST.title} | DriftGuard`,
    description: POST.description,
    keywords:    ["terraform drift detection", "terraform state drift", "infrastructure drift", "terraform plan drift", "driftctl alternative"],
    publishedAt: POST.publishedAt,
    modifiedAt:  POST.publishedAt,
  });
}

const FAQ = [
  {
    question: "What is Terraform drift?",
    answer:
      "Terraform drift is any mismatch between what your Terraform configuration declares and what actually exists in your cloud account. It happens whenever a resource is created, changed, or deleted outside of Terraform — for example, through the cloud console, a CLI command, another automation tool, or a provider-side default that changed.",
  },
  {
    question: "Does terraform plan detect drift?",
    answer:
      "Yes, partially. terraform plan refreshes the state against the real infrastructure and shows a diff if something changed outside Terraform — but only for the resources already in that state file, only when someone remembers to run it, and only against whatever provider credentials happen to be configured locally. It does not run continuously or block a pull request on its own.",
  },
  {
    question: "How is PR-time drift detection different from a scheduled drift scan?",
    answer:
      "A scheduled scan (e.g. a nightly terraform plan cron job) tells you drift happened after the fact, often hours or days later, with no PR to attach it to. PR-time detection reads the live resource state when a Terraform pull request opens and posts the delta directly on that PR, before it merges — so drift is caught at the moment someone is about to change the same resources.",
  },
];

export default function TerraformDriftDetectionGuide() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: POST.title, path: `/blog/${POST.slug}` },
      ])}
      eyebrow="Blog · Drift"
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
      <JsonLd data={jsonLdFaq(FAQ)} />

      <div className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
        <time dateTime={POST.publishedAt}>{POST.publishedAt}</time>
        <span aria-hidden="true">·</span>
        <span>{POST.readTime}</span>
      </div>

      <div className="space-y-10 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <ArticleSection title="What is Terraform drift?">
          <p>
            Terraform drift is any gap between the infrastructure your <code className="font-mono text-[color:var(--dg-electric-bright)]">.tf</code> files
            declare and the infrastructure that actually exists in your cloud account. Terraform&apos;s whole model assumes it is the
            single source of truth — every resource it manages should only ever change through a Terraform apply. Drift is what
            happens when that assumption breaks: someone edits a security group in the AWS console, a Lambda&apos;s memory setting gets
            bumped by an incident-response script, or a separate CI pipeline touches the same S3 bucket your Terraform config also owns.
          </p>
          <p>
            Left alone, drift compounds. The next <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> either
            silently reverts someone&apos;s manual fix (bad if it was intentional) or produces a plan diff nobody can explain (bad either way),
            because the plan is comparing the declared config against a state file that no longer matches reality.
          </p>
        </ArticleSection>

        <ArticleSection title="Why Terraform drift happens">
          <p>In practice, drift almost always comes from one of five sources:</p>
          <ArticleList
            items={[
              <>
                <strong className="text-[color:var(--dg-fg)]">Manual console changes</strong> — someone fixes something urgently in
                the AWS/GCP/Azure console instead of through a PR, usually during an incident.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Other automation touching the same resources</strong> — a separate
                deployment tool, a Lambda-based auto-remediation script, or a second Terraform workspace managing overlapping resources.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Provider-side defaults changing</strong> — a cloud provider changes a
                default value (e.g. a new AMI becomes the default) and the next refresh picks up a diff you didn&apos;t cause.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Out-of-band cleanup or cost-saving scripts</strong> — something that
                stops unused resources or deletes orphaned ones without going through Terraform.
              </>,
              <>
                <strong className="text-[color:var(--dg-fg)]">Stale or partially applied state</strong> — a failed
                <code className="font-mono text-[color:var(--dg-electric-bright)]"> terraform apply</code> that partially succeeded,
                leaving the state file out of sync with what was actually created.
              </>,
            ]}
          />
        </ArticleSection>

        <ArticleSection title="Four ways to detect Terraform drift">
          <p>
            <strong className="text-[color:var(--dg-fg)]">1. Run terraform plan manually.</strong> The baseline method: run{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> and read the diff. It works, but it
            depends on someone remembering to run it, having the right credentials configured locally, and being able to tell real
            drift apart from an expected, in-progress change.
          </p>
          <p>
            <strong className="text-[color:var(--dg-fg)]">2. Scheduled drift-detection jobs.</strong> A cron job (GitHub Actions,
            Jenkins, whatever you have) runs <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform plan</code> on
            a schedule and posts the output somewhere — Slack, a dashboard, an issue. This catches drift eventually, but with a lag, and
            it doesn&apos;t attach the finding to whichever pull request is about to touch the same resources.
          </p>
          <p>
            <strong className="text-[color:var(--dg-fg)]">3. Standalone drift-detection tools.</strong> Open-source tools scan your
            cloud account and your state file independently, then report unmanaged or drifted resources. Useful for a point-in-time
            audit; less useful as a continuous gate on new changes.
          </p>
          <p>
            <strong className="text-[color:var(--dg-fg)]">4. PR-time drift detection.</strong> The state is checked the moment a
            Terraform pull request opens, using short-lived read-only credentials against the live cloud account, and the result is
            posted directly on that PR — before anyone merges a change on top of resources that have already drifted.
          </p>
        </ArticleSection>

        <ArticleSection title="What PR-time drift detection looks like">
          <p>
            DriftGuard takes the fourth approach: it reads live resource state through short-lived, read-only credentials — AWS via STS{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">AssumeRole</code>, GCP via Workload Identity Federation,
            Azure via federated workload identity — and compares it against the Terraform plan attached to the pull request. No
            long-lived cloud keys are stored. Setup is a role ARN and a state location:
          </p>
          <ArticleCode>{`# In your repo settings (DriftGuard dashboard)
aws_role_arn: arn:aws:iam::123456789:role/DriftGuardReadOnly
state_bucket: my-tf-state-bucket
state_key: prod/terraform.tfstate
aws_region: eu-west-1`}</ArticleCode>
          <p>
            If you&apos;d rather not connect a cloud account, DriftGuard falls back to comparing the plan against the committed{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">terraform.tfstate</code> — narrower coverage, but still
            useful. See the <Link href="/docs/drift" className="text-[color:var(--dg-electric-bright)] hover:underline">drift detection docs</Link>{" "}
            for the full setup.
          </p>
        </ArticleSection>

        <ArticleSection title="Preventing drift, not just detecting it">
          <ArticleList
            items={[
              "Restrict console write access in accounts managed by Terraform — reserve it for break-glass incident response only.",
              "Require every infrastructure change to go through a pull request, including \"quick\" fixes.",
              "Run drift detection on every PR, not just on a schedule, so it's checked at the moment someone is about to build on top of the same resources.",
              "Keep one Terraform workspace as the sole owner of a given resource — avoid two pipelines managing overlapping infrastructure.",
              "Alert on failed applies immediately; a partially applied state is one of the most common causes of silent drift.",
            ]}
          />
        </ArticleSection>

        <ArticleSection title="FAQ">
          <div className="space-y-5">
            {FAQ.map((item) => (
              <div key={item.question}>
                <p className="font-medium text-[color:var(--dg-fg)]">{item.question}</p>
                <p className="mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </ArticleSection>
      </div>

      <div className="mt-14 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 text-center sm:p-8">
        <p className="mb-4 text-[15px] font-medium text-[color:var(--dg-fg)]">
          See drift detection on your own Terraform pull requests.
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
            href="/docs/drift"
            className="touch-manipulation inline-block rounded border border-[color:var(--dg-border-strong)] px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97]"
          >
            Read the drift docs
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
