import Link from "next/link";

export default function AnalysisNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="dg-label">404</div>
      <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
        Analysis not found
      </h2>
      <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm">
        This analysis does not exist or has been deleted.
      </p>
      <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
        ← Back to dashboard
      </Link>
    </div>
  );
}
