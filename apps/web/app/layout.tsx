import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { isRtlLocale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/get-locale";
import "./globals.css";

const inter = Inter({
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
  title: "DriftGuard — Infrastructure intelligence for Terraform PRs",
  description:
    "Operational review for OpenTofu and Terraform pull requests: cost delta, drift, security findings, and compliance evidence.",
  openGraph: {
    title: "DriftGuard",
    description: "Infrastructure intelligence for Terraform PRs.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans text-sm antialiased">
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
