import Link from "next/link";

export interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  ctaLabel?: string;
}

interface ReadinessChecklistProps {
  items: ChecklistItem[];
  title?: string;
}

export function ReadinessChecklist({ items, title = "Getting started" }: ReadinessChecklistProps) {
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) return null;

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {title}
        </span>
        <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="divide-y divide-[color:var(--dg-border)]">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                item.done ? "bg-allowed" : "bg-[color:var(--dg-border)]"
              }`}
            />
            <span
              className={`flex-1 text-[12px] ${
                item.done
                  ? "line-through text-[color:var(--dg-fg-subtle)]"
                  : "text-[color:var(--dg-fg-muted)]"
              }`}
            >
              {item.label}
            </span>
            {!item.done && item.href && item.ctaLabel && (
              <Link
                href={item.href}
                className="font-mono text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition shrink-0"
              >
                {item.ctaLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
