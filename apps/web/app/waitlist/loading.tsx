export default function Loading() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 sm:py-24 text-center">
      <div className="mb-10 space-y-4">
        <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
        <div className="h-9 w-64 rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
        <div className="h-3 w-full max-w-sm rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
      </div>
      <div className="flex justify-center gap-2">
        <div className="h-11 w-64 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-11 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
    </div>
  );
}
