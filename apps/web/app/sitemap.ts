import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app";

const STATIC_ROUTES = [
  "",
  "/docs",
  "/docs/install",
  "/docs/memory",
  "/docs/drift",
  "/docs/cost",
  "/docs/policies",
  "/docs/api",
  "/docs/first-review",
  "/pricing",
  "/pricing",
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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : route.startsWith("/docs") ? "weekly" : "monthly",
    priority: route === "" ? 1.0 : route.startsWith("/docs") ? 0.8 : 0.5,
  }));
}
