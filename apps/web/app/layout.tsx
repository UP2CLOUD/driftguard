import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { isRtlLocale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { getUserPreferences } from "@/lib/preferences/server";
import { createTranslator } from "@/i18n/translator";
import { hreflangAlternates, jsonLdOrganization, jsonLdWebSite, jsonLdProduct, ogImageUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { JsonLd } from "@/components/JsonLd";
import { NavigationTransition } from "@/components/NavigationTransition";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export async function generateMetadata(): Promise<Metadata> {
  const preferences = await getUserPreferences();
  const locale = preferences.locale as Locale;
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const title       = t("seo.title");
  const description = t("seo.description");
  const imgUrl      = ogImageUrl({ title, locale });

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default:  title,
      template: "%s · DriftGuard",
    },
    description,
    keywords: [
      "Terraform", "OpenTofu", "AI agents", "infrastructure as code",
      "drift detection", "cost analysis", "Infracost", "Checkov",
      "GitOps", "PR review", "runtime safety", "DORA", "NIS2",
    ],
    authors:   [{ name: "UP2CLOUD", url: BASE_URL }],
    creator:   "UP2CLOUD",
    publisher: "UP2CLOUD",
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      type:        "website",
      url:         "/",
      siteName:    "DriftGuard",
      locale:      locale.replace("-", "_"),
      title:       t("seo.ogTitle"),
      description: t("seo.ogDesc"),
      images: [{ url: imgUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        "summary_large_image",
      site:        "@driftguard",
      creator:     "@driftguard",
      title:       t("seo.ogTitle"),
      description: t("seo.twitterDesc"),
      images:      [imgUrl],
    },
    robots: {
      index:  true,
      follow: true,
      googleBot: {
        index:              true,
        follow:             true,
        "max-image-preview": "large",
        "max-snippet":       -1,
      },
    },
    icons: {
      icon:     [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: "/icon.svg",
      apple:    "/icon.svg",
    },
    alternates: hreflangAlternates("/"),
    other: {
      "content-language": locale,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans text-sm antialiased relative" suppressHydrationWarning>
        <JsonLd data={[
            jsonLdOrganization({ name: "DriftGuard", description: "AI runtime safety for Terraform agents", locale: locale as import("@/i18n/config").Locale }),
            jsonLdWebSite(locale as import("@/i18n/config").Locale),
          ]} />
        <I18nProvider locale={locale} messages={messages}>
          <AuthProvider>
            <PostHogProvider>
              {children}
              <NavigationTransition />
            </PostHogProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
