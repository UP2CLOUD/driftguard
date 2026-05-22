import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app";

// All public static routes — keep in sync with app/ directory
const ROUTES: { path: string; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/",                    freq: "daily",   priority: 1.0 },
  { path: "/pricing",             freq: "monthly", priority: 0.9 },
  { path: "/customers",           freq: "monthly", priority: 0.8 },
  { path: "/docs",                freq: "weekly",  priority: 0.8 },
  { path: "/docs/install",        freq: "weekly",  priority: 0.8 },
  { path: "/docs/first-review",   freq: "weekly",  priority: 0.8 },
  { path: "/docs/api",            freq: "weekly",  priority: 0.7 },
  { path: "/docs/memory",         freq: "weekly",  priority: 0.7 },
  { path: "/docs/cost",           freq: "weekly",  priority: 0.7 },
  { path: "/docs/drift",          freq: "weekly",  priority: 0.7 },
  { path: "/docs/policies",       freq: "weekly",  priority: 0.7 },
  { path: "/docs/webhooks",       freq: "weekly",  priority: 0.6 },
  { path: "/changelog",           freq: "weekly",  priority: 0.6 },
  { path: "/security",            freq: "monthly", priority: 0.6 },
  { path: "/compliance",          freq: "monthly", priority: 0.6 },
  { path: "/careers",             freq: "monthly", priority: 0.5 },
  { path: "/status",              freq: "hourly",  priority: 0.5 },
  { path: "/privacy",             freq: "yearly",  priority: 0.3 },
  { path: "/terms",               freq: "yearly",  priority: 0.3 },
  { path: "/dpa",                 freq: "yearly",  priority: 0.3 },
  { path: "/subprocessors",       freq: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map(({ path, freq, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));
}
