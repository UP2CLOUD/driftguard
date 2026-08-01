import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

export function RelatedArticles({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-14 border-t border-[color:var(--dg-border)] pt-8">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
        Related reading
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded border border-[color:var(--dg-border-strong)] p-4 transition-colors hover:border-[color:var(--dg-electric)]"
          >
            <p className="text-[14px] font-medium text-[color:var(--dg-fg)] transition-colors group-hover:text-[color:var(--dg-electric-bright)]">
              {post.title}
            </p>
            <p className="mt-1 text-[12px] text-[color:var(--dg-fg-muted)]">{post.readTime}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
