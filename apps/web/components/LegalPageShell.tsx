import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import Link from "next/link";

type LegalPageShellProps = {
  children: React.ReactNode;
  active: "privacy" | "terms";
};

export async function LegalPageShell({ children, active }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-canvas text-fg">
      <MarketingNav />

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <nav aria-label="Legal" className="mb-6 flex gap-4 font-mono text-2xs uppercase tracking-wider">
          <Link
            href="/privacy"
            className={
              active === "privacy"
                ? "text-orange-400"
                : "text-fg-subtle transition hover:text-fg-muted"
            }
          >
            Privacy
          </Link>
          <span className="text-fg-subtle">/</span>
          <Link
            href="/terms"
            className={
              active === "terms" ? "text-orange-400" : "text-fg-subtle transition hover:text-fg-muted"
            }
          >
            Terms
          </Link>
        </nav>

        {children}
      </div>

      <MarketingFooter />
    </main>
  );
}
