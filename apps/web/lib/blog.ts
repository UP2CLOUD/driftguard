/**
 * Blog post registry — single source of truth for the /blog index,
 * sitemap.ts, and robots.ts. English-only content (see blogPostMeta
 * in lib/seo.ts for why it skips the hreflang matrix).
 */
export interface BlogPost {
  slug:        string;
  title:       string;
  description: string;
  publishedAt: string; // static ISO date — see CLAUDE.md's no-new-Date()-at-module-scope rule
  readTime:    string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug:        "terraform-drift-detection-guide",
    title:       "Terraform Drift Detection: The Complete Guide",
    description:
      "What Terraform drift actually is, the five most common causes, four ways to detect it — from a manual terraform plan to PR-time detection — and how to stop it reaching production.",
    publishedAt: "2026-08-01",
    readTime:    "9 min read",
  },
  {
    slug:        "terraform-pull-request-review-checklist",
    title:       "The Terraform Pull Request Review Checklist Every Platform Team Needs",
    description:
      "A practical, copy-pasteable checklist for reviewing Terraform pull requests — drift, cost, security, and policy — before they merge, not after.",
    publishedAt: "2026-08-01",
    readTime:    "8 min read",
  },
  {
    slug:        "terraform-cost-security-guardrails-cicd",
    title:       "How to Add Cost and Security Guardrails to Your Terraform CI/CD Pipeline",
    description:
      "A hands-on walkthrough of wiring Infracost, Checkov, and policy-as-code into Terraform CI so cost and security issues are caught before merge, not in a postmortem.",
    publishedAt: "2026-08-01",
    readTime:    "10 min read",
  },
  {
    slug:        "dora-nis2-compliance-infrastructure-as-code",
    title:       "DORA and NIS2 Compliance for Infrastructure as Code: A Practical Guide",
    description:
      "How to map Terraform pull request checks to DORA and NIS2 change-management and ICT-risk requirements, and generate the evidence an auditor actually wants to see.",
    publishedAt: "2026-08-01",
    readTime:    "8 min read",
  },
  {
    slug:        "opentofu-vs-terraform-drift-security",
    title:       "OpenTofu vs Terraform: What Changes for Drift Detection and Security Scanning",
    description:
      "OpenTofu and Terraform share a plan/state model, so most drift, cost, and security tooling carries over — here's exactly where they diverge and what to check before you migrate.",
    publishedAt: "2026-08-01",
    readTime:    "7 min read",
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
