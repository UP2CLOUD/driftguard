import Link from "next/link";

export function DashboardFooter() {
  return (
    <footer className="border-t border-[color:var(--dg-border)] mt-auto">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
        <div className="flex items-center gap-4">
          <span>© 2026 UP2CLOUD</span>
          <span className="opacity-40">·</span>
          <Link href="/docs" className="hover:text-[color:var(--dg-fg)] transition">Docs</Link>
          <span className="opacity-40">·</span>
          <Link href="/privacy" className="hover:text-[color:var(--dg-fg)] transition">Privacy</Link>
          <span className="opacity-40">·</span>
          <Link href="/terms" className="hover:text-[color:var(--dg-fg)] transition">Terms</Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
