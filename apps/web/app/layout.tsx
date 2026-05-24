import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { isRtlLocale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/get-locale";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app"),
  title: {
    default: "DriftGuard — AI runtime safety for Terraform agents",
    template: "%s · DriftGuard",
  },
  description:
    "DriftGuard reviews every Terraform PR your AI agents open — cost, drift, security, compliance. Semantic memory of past incidents prevents repeat mistakes.",
  keywords: [
    "Terraform", "OpenTofu", "AI agents", "infrastructure as code",
    "drift detection", "cost analysis", "Infracost", "Checkov",
    "GitOps", "PR review", "runtime safety", "DORA", "NIS2",
  ],
  authors: [{ name: "UP2CLOUD", url: "https://driftguard-blue.vercel.app" }],
  creator: "UP2CLOUD",
  publisher: "UP2CLOUD",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "DriftGuard",
    title: "DriftGuard — AI runtime safety for Terraform agents",
    description: "Cost · drift · security · compliance on every Terraform PR. Memory prevents repeat incidents.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DriftGuard",
    description: "AI runtime safety for Terraform agents.",
    creator: "@driftguard",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "pt-BR": "/",
      "es-ES": "/",
      "zh-CN": "/",
      "hi-IN": "/",
      "ar-SA": "/",
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${geist.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans text-sm antialiased relative" suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
