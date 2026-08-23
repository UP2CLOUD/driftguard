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
    path:        "/docs/audit",
    locale,
    title:       t("docs.audit.metaTitle"),
    description: t("docs.audit.metaDescription"),
  });
}

// Matches driftguard.db.models.AuditLog exactly: {id, org_id, actor, action,
// target, payload, created_at}. No seq/hash fields exist anywhere in the
// schema — see the note in whatRecordedBody about why that matters.
const RECORD = `{
  "id": "3f9b7c2a-...",
  "actor": "api",
  "action": "repo.enabled",
  "target": "9c1a4e70-...",
  "payload": { "full_name": "acme/platform" },
  "created_at": "2026-07-21T10:04:11Z"
}`;

export default async function Audit() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.audit.title"), path: "/docs/audit" },
      ])}
      eyebrow={t("docs.audit.eyebrow")}
      title={t("docs.audit.title")}
      subtitle={t("docs.audit.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.audit.whatRecordedTitle")}</h2>
          <p>
            {t("docs.audit.whatRecordedBody")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>{t("docs.audit.item1")}</li>
            <li>{t("docs.audit.item2")}</li>
            <li>{t("docs.audit.item3")}</li>
            <li>{t("docs.audit.item4")}</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.audit.enableTitle")}</h2>
          <p>{t("docs.audit.enableBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.audit.recordShapeTitle")}</h2>
          <p>{t("docs.audit.recordShapeBody")}</p>
          <div className="mt-3">
            <CodeBlock code={RECORD} filename="audit-record.json" />
          </div>
          <p className="mt-3">
            {t("docs.audit.recordShapeFooter")}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
