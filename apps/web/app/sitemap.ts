/**
 * Multilingual sitemap — /sitemap.xml
 *
 * Architecture: cookie-based locale (no URL prefixes).
 * Each URL includes hreflang alternates pointing to the same URL
 * for all 6 supported locales — signals multilingual intent to crawlers.
 *
 * Next.js 15 MetadataRoute.Sitemap supports `alternates.languages`
 * which renders as <xhtml:link rel="alternate" hreflang="..."> entries.
 */
import type { MetadataRoute } from "next";
import { locales, LOCALE_BCP47_MAP } from "@/i18n/sitemap-helpers";

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app"
).replace(/\/$/, "");

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

interface Route {
  path:     string;
  freq:     Freq;
  priority: number;
}

const ROUTES: Route[] = [
  { path: "/",                  freq: "daily",   priority: 1.0 },
  { path: "/pricing",           freq: "monthly", priority: 0.9 },
  { path: "/docs",              freq: "weekly",  priority: 0.8 },
  { path: "/docs/install",      freq: "weekly",  priority: 0.8 },
  { path: "/docs/first-review", freq: "weekly",  priority: 0.8 },
  { path: "/docs/api",          freq: "weekly",  priority: 0.7 },
  { path: "/docs/memory",       freq: "weekly",  priority: 0.7 },
  { path: "/docs/cost",         freq: "weekly",  priority: 0.7 },
  { path: "/docs/drift",        freq: "weekly",  priority: 0.7 },
  { path: "/docs/policies",     freq: "weekly",  priority: 0.7 },
  { path: "/docs/security",     freq: "weekly",  priority: 0.7 },
  { path: "/docs/dora",         freq: "monthly", priority: 0.6 },
  { path: "/docs/nis2",         freq: "monthly", priority: 0.6 },
  { path: "/docs/iso-27001",    freq: "monthly", priority: 0.6 },
  { path: "/docs/audit",        freq: "monthly", priority: 0.6 },
  { path: "/docs/aws",          freq: "monthly", priority: 0.6 },
  { path: "/docs/gcp",          freq: "monthly", priority: 0.6 },
  { path: "/docs/azure",        freq: "monthly", priority: 0.6 },
  { path: "/docs/slack",        freq: "monthly", priority: 0.6 },
  { path: "/docs/cloud-run",    freq: "monthly", priority: 0.5 },
  { path: "/docs/env",          freq: "monthly", priority: 0.5 },
  { path: "/docs/rate-limits",  freq: "monthly", priority: 0.5 },
  { path: "/docs/webhooks",     freq: "weekly",  priority: 0.6 },
  { path: "/docs/self-host",    freq: "monthly", priority: 0.6 },
  { path: "/waitlist",          freq: "monthly", priority: 0.7 },
  { path: "/customers",         freq: "monthly", priority: 0.8 },
  { path: "/changelog",         freq: "weekly",  priority: 0.6 },
  { path: "/security",          freq: "monthly", priority: 0.6 },
  { path: "/compliance",        freq: "monthly", priority: 0.6 },
  { path: "/careers",           freq: "monthly", priority: 0.5 },
  { path: "/status",            freq: "hourly",  priority: 0.5 },
  { path: "/privacy",           freq: "yearly",  priority: 0.3 },
  { path: "/terms",             freq: "yearly",  priority: 0.3 },
  { path: "/dpa",               freq: "yearly",  priority: 0.3 },
  { path: "/subprocessors",     freq: "monthly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return ROUTES.map(({ path, freq, priority }) => {
    const url = `${BASE}${path}`;

    // hreflang alternates — same URL for all locales (cookie-based i18n)
    const languages: Record<string, string> = { "x-default": url };
    for (const locale of locales) {
      languages[LOCALE_BCP47_MAP[locale]] = url;
    }

    return {
      url,
      lastModified:    now,
      changeFrequency: freq,
      priority,
      alternates:      { languages },
    };
  });
}
