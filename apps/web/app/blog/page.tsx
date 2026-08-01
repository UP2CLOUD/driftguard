import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { blogPostMeta, jsonLdBreadcrumb } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog";

export async function generateMetadata(): Promise<Metadata> {
  return blogPostMeta({
    path:        "/blog",
    title:       "Blog — Terraform Drift, Cost, and Security | DriftGuard",
    description: "Practical guides on Terraform drift detection, pull request review, cost estimation, and security scanning for platform and DevOps teams.",
    keywords:    ["terraform drift detection", "terraform pull request review", "infrastructure as code security", "terraform cost estimation"],
  });
}

export default function BlogIndex() {
  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])}
      eyebrow="Blog"
      title="Terraform drift, cost, and security — in practice"
      subtitle="Guides written from what actually breaks Terraform pipelines in production: drift, surprise cloud bills, and misconfigurations that slip past a quick glance."
      narrow
    >
      <div className="divide-y divide-[color:var(--dg-border)]">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="py-8 first:pt-0">
            <Link href={`/blog/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold text-[color:var(--dg-fg)] transition-colors group-hover:text-[color:var(--dg-electric-bright)]">
                {post.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--dg-fg-muted)]">
                {post.description}
              </p>
              <div className="mt-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </MarketingPageShell>
  );
}
