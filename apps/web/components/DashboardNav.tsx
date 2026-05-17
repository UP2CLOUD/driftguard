import Link from "next/link";

export function DashboardNav({ installationId, planLabel }: { installationId: string; planLabel?: string }) {
  return (
    <nav className="border-b border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/dashboard/${installationId}`} className="font-display text-lg font-bold">
          driftguard
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href={`/dashboard/${installationId}`} className="hover:text-accent">
            Repos
          </Link>
          <Link href={`/dashboard/${installationId}/settings`} className="hover:text-accent">
            Settings
          </Link>
          {planLabel && (
            <span className="rounded-full border border-ink/15 px-3 py-1 text-xs uppercase tracking-widest">
              {planLabel}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
