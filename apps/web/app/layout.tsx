import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
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
  title: "DriftGuard — AI runtime safety & semantic memory",
  description:
    "DriftGuard sits between agent intent and execution. Remembers failures semantically. Prevents repeat errors. Production-grade governance for AI agents.",
  openGraph: {
    title: "DriftGuard",
    description: "AI runtime safety. Semantic memory. Operational guardrails.",
    type: "website",
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
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
