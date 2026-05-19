import { auth } from "@/auth";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";

type LegalPageShellProps = {
  children: React.ReactNode;
  active: "privacy" | "terms";
};

export async function LegalPageShell({ children, active }: LegalPageShellProps) {
  const session = await auth();
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      <StatusBar />
      <MarketingNav isLoggedIn={!!session} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Legal" className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
          <span className="h-px w-4 bg-[color:var(--dg-electric)]" />
          <Link
            href="/privacy"
            className={
              active === "privacy"
                ? "text-[color:var(--dg-electric-bright)]"
                : "text-[color:var(--dg-fg-subtle)] transition hover:text-[color:var(--dg-fg)]"
            }
          >
            Privacy
          </Link>
          <span className="text-[color:var(--dg-fg-subtle)]">/</span>
          <Link
            href="/terms"
            className={
              active === "terms"
                ? "text-[color:var(--dg-electric-bright)]"
                : "text-[color:var(--dg-fg-subtle)] transition hover:text-[color:var(--dg-fg)]"
            }
          >
            Terms
          </Link>
        </nav>

        {children}
      </div>

      <Footer />
    </main>
  );
}
