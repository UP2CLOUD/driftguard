import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-canvas py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 font-mono text-2xs text-fg-subtle">
        <div>© 2026 Driftguard · UP2CLOUD</div>
        <div className="flex gap-4">
          <a href="https://github.com/UP2CLOUD/driftguard" className="transition hover:text-fg-muted">
            GitHub
          </a>
          <Link href="/privacy" className="transition hover:text-fg-muted">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-fg-muted">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
