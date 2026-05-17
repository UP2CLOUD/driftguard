import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Driftguard — AI code review for Terraform PRs",
  description:
    "Catch cost, drift, and security issues in your Terraform PRs in 30 seconds. AI review for infrastructure-as-code.",
  openGraph: {
    title: "Driftguard",
    description: "AI code review for Terraform PRs.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
