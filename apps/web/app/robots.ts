import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/customers",
          "/changelog",
          "/security",
          "/compliance",
          "/careers",
          "/status",
          "/docs",
          "/docs/",
          "/privacy",
          "/terms",
          "/dpa",
          "/subprocessors",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
