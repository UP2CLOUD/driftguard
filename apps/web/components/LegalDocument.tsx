import type { LegalDocumentContent } from "@/lib/legal-content";

export function LegalDocument({ document }: { document: LegalDocumentContent }) {
  return (
    <article className="dg-panel p-6 md:p-8">
      <header className="border-b border-[color:var(--dg-border)] pb-6">
        <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {document.label}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[color:var(--dg-fg)] md:text-3xl">
          {document.title}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--dg-fg-muted)]">
          Effective date:{" "}
          <time dateTime={document.effectiveDate}>{document.effectiveDate}</time>
          {" · "}
          Last updated:{" "}
          <time dateTime={document.lastUpdated}>{document.lastUpdated}</time>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[color:var(--dg-fg-muted)]">
          {document.intro}
        </p>
      </header>

      <div className="mt-8 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id}>
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--dg-fg)]">
              {section.title}
            </h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-[color:var(--dg-fg-muted)]">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--dg-fg-muted)]">
                {section.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
