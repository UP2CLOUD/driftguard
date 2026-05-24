import type { MetadataRoute } from "next";

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Main crawlers — allow public content
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/docs",
          "/docs/",
          "/customers",
          "/changelog",
          "/security",
          "/compliance",
          "/careers",
          "/status",
          "/privacy",
          "/terms",
          "/dpa",
          "/subprocessors",
          "/og",          // OG image endpoint — allow prerender
          "/sitemap.xml",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/_next/",
          "/install/callback",
          "/?*",          // Block query-string variants to avoid duplicate indexing
        ],
      },
      // Block AI training scrapers
      { userAgent: "GPTBot",          disallow: ["/"] },
      { userAgent: "ChatGPT-User",    disallow: ["/"] },
      { userAgent: "CCBot",           disallow: ["/"] },
      { userAgent: "anthropic-ai",    disallow: ["/"] },
      { userAgent: "Claude-Web",      disallow: ["/"] },
      { userAgent: "cohere-ai",       disallow: ["/"] },
      { userAgent: "Bytespider",      disallow: ["/"] },
      { userAgent: "omgili",          disallow: ["/"] },
    ],
    sitemap:  `${BASE}/sitemap.xml`,
    host:     BASE,
  };
}
