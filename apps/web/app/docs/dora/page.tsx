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
    path:        "/docs/dora",
    locale,
    title:       t("docs.dora.metaTitle"),
    description: t("docs.dora.metaDescription"),
  });
}

// Real shape, from compliance/controls.py::CATALOG. Compliance citations are
// only produced for Checkov-sourced findings (CKV_AWS_16, unencrypted RDS
// storage, shown here) -- DriftGuard's own native scanner rules (TF00x,
// K8S00x, GHA00x) are not in this lookup table yet and carry no citation.
const EVIDENCE = `{
  "control_id": "encryption_at_rest",
  "triggering_rule": "CKV_AWS_16",
  "refs": [
    { "framework": "DORA", "code": "Art.9", "title": "ICT risk protection and prevention" },
    { "framework": "NIS2", "code": "Art.21(2)(h)", "title": "Cryptography and encryption policies" },
    { "framework": "ISO27001", "code": "A.8.24", "title": "Use of cryptography" }
  ]
}`;

export default async function Dora() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.dora.title"), path: "/docs/dora" },
      ])}
      eyebrow={t("docs.dora.eyebrow")}
      title={t("docs.dora.title")}
      subtitle={t("docs.dora.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.mappingTitle")}</h2>
          <p>
            {t("docs.dora.mappingBody")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">ICT risk (Art. 6–8)</span> — {t("docs.dora.item1_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Change management (Art. 9)</span> — {t("docs.dora.item2_desc")}</li>
            <li><span className="font-mono text-[color:var(--dg-electric-bright)]">Learning &amp; evolving (Art. 13)</span> — {t("docs.dora.item3_desc")}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.enableTitle")}</h2>
          <p>{t("docs.dora.enableBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.dora.evidenceTitle")}</h2>
          <p>{t("docs.dora.evidenceBody")}</p>
          <div className="mt-3">
            <CodeBlock code={EVIDENCE} filename="dora-evidence.json" />
          </div>
          <p className="mt-3">
            {t("docs.dora.evidenceFooter")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
