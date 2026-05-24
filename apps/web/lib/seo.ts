/**
 * DriftGuard SEO helpers — production-grade multilingual metadata.
 *
 * Architecture: cookie-based locale (single canonical URL per page).
 * All locales share the same canonical URL; hreflang points to same URL
 * with x-default fallback. Metadata is SSR-translated via generateMetadata().
 *
 * Usage (server component / page):
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const { locale, t } = await getSeoContext();
 *     return localizedPageMeta({ path: "/pricing", locale, t });
 *   }
 */
import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app"
).replace(/\/$/, "");

// ── Locale → BCP-47 / OG locale map ──────────────────────────────────────────

export const LOCALE_BCP47: Record<Locale, string> = {
  en:    "en-US",
  "pt-BR": "pt-BR",
  es:    "es-ES",
  zh:    "zh-CN",
  hi:    "hi-IN",
  ar:    "ar-SA",
};

export const LOCALE_OG: Record<Locale, string> = {
  en:    "en_US",
  "pt-BR": "pt_BR",
  es:    "es_ES",
  zh:    "zh_CN",
  hi:    "hi_IN",
  ar:    "ar_SA",
};

// ── Canonical + hreflang ──────────────────────────────────────────────────────

/** Full canonical URL for a path. */
export function canonical(path: string): string {
  return `${BASE}${path}`;
}

/**
 * hreflang alternates for a path.
 * All locales point to the same URL (cookie-based i18n).
 * x-default = en (primary market).
 */
export function hreflangAlternates(path: string): NonNullable<Metadata["alternates"]> {
  const url = canonical(path);
  const languages: Record<string, string> = { "x-default": url };
  for (const locale of locales) {
    languages[LOCALE_BCP47[locale]] = url;
  }
  return { canonical: path, languages };
}

// ── OG image URL ──────────────────────────────────────────────────────────────

/** Returns OG image URL, with optional per-page title encoding. */
export function ogImageUrl(opts: { title?: string; locale?: Locale } = {}): string {
  const params = new URLSearchParams();
  if (opts.title)  params.set("t", opts.title.slice(0, 120));
  if (opts.locale) params.set("l", opts.locale);
  const qs = params.toString();
  return `${BASE}/og${qs ? `?${qs}` : ""}`;
}

// ── Localized page metadata ───────────────────────────────────────────────────

export interface LocalizedMetaOpts {
  path:        string;
  locale:      Locale;
  /** Pre-translated strings (pass result of createTranslator(messages)) */
  title:       string;
  description: string;
  keywords?:   string[];
  /** Override OG title (defaults to title) */
  ogTitle?:    string;
  /** Override OG description (defaults to description) */
  ogDesc?:     string;
  /** Override Twitter description */
  twitterDesc?: string;
  /** Override image (defaults to dynamic /og) */
  image?:      string;
  type?:       "website" | "article";
  /** Article published date */
  publishedAt?: string;
}

export function localizedPageMeta(opts: LocalizedMetaOpts): Metadata {
  const {
    path, locale, title, description, keywords,
    ogTitle, ogDesc, twitterDesc, image, type = "website", publishedAt,
  } = opts;

  const url      = canonical(path);
  const imgUrl   = image ?? ogImageUrl({ title, locale });
  const dir      = locale === "ar" ? "rtl" : "ltr";

  const meta: Metadata = {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: hreflangAlternates(path),

    openGraph: {
      type,
      url,
      siteName: "DriftGuard",
      locale:   LOCALE_OG[locale],
      title:    ogTitle ?? title,
      description: ogDesc ?? description,
      images: [{
        url:    imgUrl,
        width:  1200,
        height: 630,
        alt:    ogTitle ?? title,
      }],
      ...(publishedAt ? { publishedTime: publishedAt } : {}),
    },

    twitter: {
      card:        "summary_large_image",
      site:        "@driftguard",
      creator:     "@driftguard",
      title:       ogTitle ?? title,
      description: twitterDesc ?? description,
      images:      [imgUrl],
    },

    // Let search engines know the page language
    other: {
      "content-language": LOCALE_BCP47[locale],
      ...(dir === "rtl" ? { "content-direction": "rtl" } : {}),
    },
  };

  return meta;
}

// ── Legacy helper (still used by pages not yet migrated) ─────────────────────

/** @deprecated Use localizedPageMeta with generateMetadata() instead. */
export function pageMeta(opts: {
  title:       string;
  description: string;
  path:        string;
  keywords?:   string[];
  image?:      string;
}): Metadata {
  return localizedPageMeta({
    path:        opts.path,
    locale:      "en",
    title:       opts.title,
    description: opts.description,
    keywords:    opts.keywords,
    image:       opts.image,
  });
}

// ── JSON-LD structured data builders ─────────────────────────────────────────

export interface JsonLdOrg {
  name:        string;
  description: string;
  locale:      Locale;
}

export function jsonLdOrganization({ name, description, locale }: JsonLdOrg) {
  return {
    "@context": "https://schema.org",
    "@type":    "Organization",
    name,
    description,
    url:        BASE,
    logo: {
      "@type":      "ImageObject",
      url:          `${BASE}/icon.svg`,
      contentUrl:   `${BASE}/icon.svg`,
    },
    sameAs: [
      "https://github.com/UP2CLOUD/driftguard",
    ],
    inLanguage: LOCALE_BCP47[locale],
  };
}

export interface JsonLdProductOpts {
  name:        string;
  description: string;
  locale:      Locale;
}

export function jsonLdProduct({ name, description, locale }: JsonLdProductOpts) {
  return {
    "@context": "https://schema.org",
    "@type":    "SoftwareApplication",
    name,
    description,
    url:             BASE,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type":       "Offer",
      price:         "0",
      priceCurrency: "EUR",
      availability:  "https://schema.org/InStock",
    },
    inLanguage: LOCALE_BCP47[locale],
  };
}

export function jsonLdWebSite(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:       "DriftGuard",
    url:        BASE,
    inLanguage: LOCALE_BCP47[locale],
    potentialAction: {
      "@type":       "SearchAction",
      target:        `${BASE}/docs?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdBreadcrumb(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type":   "ListItem",
      position:  i + 1,
      name:      item.name,
      item:      canonical(item.path),
    })),
  };
}

export function jsonLdFaq(
  items: ({ q: string; a: string } | { question: string; answer: string })[]
) {
  return {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: items.map((item) => {
      const q = "q" in item ? item.q : item.question;
      const a = "a" in item ? item.a : item.answer;
      return {
        "@type":       "Question",
        name:          q,
        acceptedAnswer: { "@type": "Answer", text: a },
      };
    }),
  };
}

export function jsonLdArticle(opts: {
  title:       string;
  description: string;
  path:        string;
  locale:      Locale;
  datePublished?: string;
  dateModified?:  string;
}) {
  return {
    "@context":   "https://schema.org",
    "@type":      "TechArticle",
    headline:     opts.title,
    description:  opts.description,
    url:          canonical(opts.path),
    inLanguage:   LOCALE_BCP47[opts.locale],
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified  ? { dateModified:  opts.dateModified  } : {}),
    author:       { "@type": "Organization", name: "DriftGuard" },
    publisher: {
      "@type":  "Organization",
      name:     "DriftGuard",
      logo:     { "@type": "ImageObject", url: `${BASE}/icon.svg` },
    },
  };
}

// ── Compatibility aliases (legacy callers) ────────────────────────────────────

/** @deprecated Use jsonLdProduct */
export function jsonLdSoftware() {
  return jsonLdProduct({ name: "DriftGuard", description: "AI runtime safety for Terraform agents", locale: "en" });
}

/** @deprecated Use jsonLdOrganization */
export function jsonLdOrg() {
  return jsonLdOrganization({ name: "DriftGuard", description: "AI runtime safety for Terraform agents", locale: "en" });
}

