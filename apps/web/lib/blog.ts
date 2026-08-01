/**
 * Blog post registry — single source of truth for the /blog index,
 * sitemap.ts, and robots.ts. English-only content (see blogPostMeta
 * in lib/seo.ts for why it skips the hreflang matrix).
 */
export interface BlogPost {
  slug:        string;
  title:       string;
  /** Short form for the <title> tag — full `title` is used for the on-page H1 and JSON-LD headline. */
  seoTitle:    string;
  description: string;
  publishedAt: string; // static ISO date — see CLAUDE.md's no-new-Date()-at-module-scope rule
  readTime:    string;
  /** Slugs of related posts, for cross-linking (topical clustering). */
  related:     string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug:        "terraform-drift-detection-guide",
    title:       "Terraform Drift Detection: The Complete Guide",
    seoTitle:    "Terraform Drift Detection: The Complete Guide",
    description:
      "What Terraform drift is, why it happens, and four ways to detect it — from a manual terraform plan to automated PR-time detection.",
    publishedAt: "2026-08-01",
    readTime:    "9 min read",
    related:     ["terraform-pull-request-review-checklist", "opentofu-vs-terraform-drift-security"],
  },
  {
    slug:        "terraform-pull-request-review-checklist",
    title:       "The Terraform Pull Request Review Checklist Every Platform Team Needs",
    seoTitle:    "Terraform Pull Request Review Checklist",
    description:
      "A practical, copy-pasteable checklist for reviewing Terraform pull requests — drift, cost, security, and policy — before they merge, not after.",
    publishedAt: "2026-08-01",
    readTime:    "8 min read",
    related:     ["terraform-drift-detection-guide", "terraform-cost-security-guardrails-cicd"],
  },
  {
    slug:        "terraform-cost-security-guardrails-cicd",
    title:       "How to Add Cost and Security Guardrails to Your Terraform CI/CD Pipeline",
    seoTitle:    "Terraform CI/CD: Cost & Security Guardrails",
    description:
      "A hands-on walkthrough of wiring Infracost, Checkov, and policy-as-code into Terraform CI so issues are caught before merge, not in a postmortem.",
    publishedAt: "2026-08-01",
    readTime:    "10 min read",
    related:     ["terraform-pull-request-review-checklist", "dora-nis2-compliance-infrastructure-as-code"],
  },
  {
    slug:        "dora-nis2-compliance-infrastructure-as-code",
    title:       "DORA and NIS2 Compliance for Infrastructure as Code: A Practical Guide",
    seoTitle:    "DORA & NIS2 Compliance for Terraform",
    description:
      "How to map Terraform PR checks to DORA and NIS2 change-management and ICT-risk requirements, and generate evidence an auditor actually wants.",
    publishedAt: "2026-08-01",
    readTime:    "8 min read",
    related:     ["terraform-cost-security-guardrails-cicd", "terraform-drift-detection-guide"],
  },
  {
    slug:        "opentofu-vs-terraform-drift-security",
    title:       "OpenTofu vs Terraform: What Changes for Drift Detection and Security Scanning",
    seoTitle:    "OpenTofu vs Terraform: Drift & Security",
    description:
      "OpenTofu and Terraform share a plan/state model, so most tooling carries over — here's exactly where they diverge for drift and security scanning.",
    publishedAt: "2026-08-01",
    readTime:    "7 min read",
    related:     ["terraform-drift-detection-guide", "terraform-pull-request-review-checklist"],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(post: BlogPost): BlogPost[] {
  return post.related.map((slug) => getBlogPost(slug)).filter((p): p is BlogPost => p !== undefined);
}
