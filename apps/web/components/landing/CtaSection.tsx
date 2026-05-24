"use client";

import { useT } from "@/components/TranslationProvider";

export function CtaSection({
  cta,
}: {
  cta: React.ReactNode;
}) {
  const t = useT();

  return (
    <section id="waitlist" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-6">
            {t("cta.headline")}
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {cta}
            <a
              href="/docs"
              className="dg-button dg-button-ghost text-[13px]"
            >
              {t("cta.readDocs")}
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-allowed" />
              {t("cta.otuCompatible")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[color:var(--dg-electric)]" />
              {t("cta.noCodeChange")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
