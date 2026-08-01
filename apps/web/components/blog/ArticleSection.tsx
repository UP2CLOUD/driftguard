export function ArticleSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{title}</h2>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function ArticleCode({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-4 font-mono text-[12px] text-[color:var(--dg-fg)]">
      {children}
    </pre>
  );
}

export function ArticleList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[color:var(--dg-electric)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
