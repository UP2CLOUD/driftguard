/**
 * SEO helpers — canonical URLs, per-page metadata factory, JSON-LD builders.
 */
import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app";

/** Build a full canonical URL from a path. */
export function canonical(path: string): string {
  return `${BASE}${path}`;
}

/** Standard page metadata with OG + canonical. */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
}): Metadata {
  const { title, description, path, keywords, image } = opts;
  const url = canonical(path);
  const ogImage = image ?? `${BASE}/opengraph-image`;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: "DriftGuard",
      type: "website",
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@driftguard_io",
      images: [ogImage],
    },
  };
}

// ── JSON-LD builders ──────────────────────────────────────────────────────

export function jsonLdOrg() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DriftGuard",
    url: BASE,
    logo: `${BASE}/logo.png`,
    sameAs: [
      "https://github.com/UP2CLOUD/driftguard",
      "https://twitter.com/driftguard_io",
    ],
    contactPoint: { "@type": "ContactPoint", email: "hello@driftguard.io" },
  };
}

export function jsonLdSoftware() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DriftGuard",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cloud",
    url: BASE,
    description:
      "AI runtime safety layer for Terraform and OpenTofu. Reviews every PR your AI agents open — cost, drift, security, compliance — and builds semantic memory of past incidents.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free tier available. Team from €29/repo/month.",
    },
    creator: { "@type": "Organization", name: "UP2CLOUD", url: BASE },
    featureList: [
      "Terraform PR review",
      "Cost delta analysis (Infracost)",
      "Security scanning (Checkov)",
      "Live drift detection (AWS STS)",
      "Semantic memory (pgvector)",
      "DORA/NIS2/ISO27001 compliance evidence",
    ],
  };
}

export function jsonLdBreadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

export function jsonLdFaq(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function jsonLdArticle(opts: {
  title: string;
  description: string;
  path: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: opts.title,
    description: opts.description,
    url: canonical(opts.path),
    dateModified: opts.dateModified ?? new Date().toISOString().split("T")[0],
    author: { "@type": "Organization", name: "DriftGuard" },
    publisher: { "@type": "Organization", name: "DriftGuard", url: BASE },
  };
}
