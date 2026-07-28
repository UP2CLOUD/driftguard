import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { jsonLdBreadcrumb, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { CodeBlock } from "@/components/docs/CodeBlock";

export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/iso-27001",
    locale,
    title:       t("docs.iso.metaTitle"),
    description: t("docs.iso.metaDescription"),
  });
}

const CONFIG = `# .github/driftguard.yml
compliance:
  frameworks:
    - iso-27001       # ISO/IEC 27001:2022 Annex A
  evidence:
    emit: true
    export: audit-log`;

const CONTROLS: { id: string; nameKey: string; checkKey: string }[] = [
  { id: "A.8.9",  nameKey: "docs.iso.control1_name", checkKey: "docs.iso.control1_check" },
  { id: "A.8.32", nameKey: "docs.iso.control2_name", checkKey: "docs.iso.control2_check" },
  { id: "A.8.15", nameKey: "docs.iso.control3_name", checkKey: "docs.iso.control3_check" },
  { id: "A.5.7",  nameKey: "docs.iso.control4_name", checkKey: "docs.iso.control4_check" },
];

export default async function Iso27001() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.iso.title"), path: "/docs/iso-27001" },
      ])}
      eyebrow={t("docs.iso.eyebrow")}
      title={t("docs.iso.title")}
      subtitle={t("docs.iso.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.iso.mappingTitle")}</h2>
          <p>
            {t("docs.iso.mappingBody")}
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-[color:var(--dg-border)]">
            {CONTROLS.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-1 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3 last:border-b-0 sm:grid-cols-[90px_1fr]"
              >
                <span className="font-mono text-[12px] text-[color:var(--dg-electric-bright)]">{c.id}</span>
                <span className="text-[12px] text-[color:var(--dg-fg)]">
                  <span className="font-semibold">{t(c.nameKey)}</span> — {t(c.checkKey)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.iso.enableTitle")}</h2>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.iso.evidenceTitle")}</h2>
          <p>
            {t("docs.iso.evidenceBody")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
