import Link from "next/link";

interface Action {
  label: string;
  href?: string;
  variant?: "primary" | "ghost";
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actions?: Action[];
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actions, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      {icon && (
        <div className="mb-4 font-mono text-2xl text-[color:var(--dg-fg-subtle)]">{icon}</div>
      )}
      <p className={`font-sans font-medium text-[color:var(--dg-fg-muted)] mb-1 ${compact ? "text-[12px]" : "text-[13px]"}`}>
        {title}
      </p>
      <p className={`text-[color:var(--dg-fg-subtle)] max-w-sm mb-5 leading-relaxed ${compact ? "text-[11px]" : "text-[12px]"}`}>
        {description}
      </p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map((a) =>
            a.href ? (
              <Link
                key={a.label}
                href={a.href}
                className={
                  a.variant === "primary"
                    ? "rounded bg-[color:var(--dg-electric)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-white hover:brightness-110 transition"
                    : "rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
                }
              >
                {a.label}
              </Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
