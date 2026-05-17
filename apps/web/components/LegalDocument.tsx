import type { LegalDocumentContent } from "@/lib/legal-content";

type LegalDocumentProps = {
  document: LegalDocumentContent;
};

export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <article className="dg-panel p-6 md:p-8">
      <header className="border-b border-border pb-6">
        <p className="font-mono text-2xs uppercase tracking-widest text-fg-subtle">{document.label}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg md:text-3xl">{document.title}</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Effective date: <time dateTime={document.effectiveDate}>{document.effectiveDate}</time>
          {" · "}
          Last updated: <time dateTime={document.lastUpdated}>{document.lastUpdated}</time>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">{document.intro}</p>
      </header>

      <div className="mt-8 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-lg font-semibold tracking-tight text-fg">{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-3 text-sm leading-relaxed text-fg-muted">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-muted">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
