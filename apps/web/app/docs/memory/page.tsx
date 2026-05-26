import { type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { pageMeta, jsonLdBreadcrumb, jsonLdArticle, localizedPageMeta } from "@/lib/seo";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export async function generateMetadata(): Promise<Metadata> {
  const prefs  = await getUserPreferences();
  const locale = prefs.locale as Locale;
  const msgs   = await getMessages(locale);
  const t      = createTranslator(msgs);
  return localizedPageMeta({
    path:        "/docs/memory",
    locale,
    title:       t("docs.meta.title"),
    description: t("docs.meta.description"),
  });
}

export default async function Memory() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([{ name: "Home", path: "/" }, { name: "Docs", path: "/docs" }, { name: "Memory", path: "/docs/memory" }])}
      eyebrow={t("docs.memory.eyebrow")} title={t("docs.memory.title")} subtitle={t("docs.memory.subtitle")} narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <Section title={t("docs.description")}>
          Every finding from every PR analysis is converted into a 384-dimensional embedding using the Voyage-3-lite model. The embedding captures: the resource type, the change intent, the blast radius, and the severity. It is stored in a pgvector index alongside the original finding text, the repository, the PR number, and the outcome (blocked / allowed).
        </Section>
        <Section title={t("docs.howItWorks")}>
          When a new PR arrives, its plan diff is embedded using the same model. A cosine similarity search returns the top-k most similar past incidents with similarity ≥ 0.5. Results are attached to the PR comment as citations.
        </Section>
        <Section title={t("docs.description")}>
          Memory is isolated per organisation. No cross-tenant recall. On the Team plan, retention is 365 days. On Enterprise, unlimited. Memory is encrypted at rest (AES-256).
        </Section>
        <Section title={t("docs.apiRef")}>
          You can query the memory index directly via <code className="font-mono text-[color:var(--dg-electric-bright)]">{t("docs.postRecall")}</code>. See the <a href="/docs/api" className="text-[color:var(--dg-electric-bright)] hover:underline">{t("docs.apiRef")}</a> for the full schema.
        </Section>
      </div>
    </MarketingPageShell>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
