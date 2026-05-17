import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans text-sm antialiased">{children}</body>
    </html>
  );
}
