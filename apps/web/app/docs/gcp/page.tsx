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
    path:        "/docs/gcp",
    locale,
    title:       "GCP integration — DriftGuard",
    description: "Connect Google Cloud to DriftGuard with Workload Identity Federation — read-only drift detection, no service-account keys to store.",
  });
}

const WIF = `# Create a workload identity pool + provider (one time)
gcloud iam workload-identity-pools create driftguard \\
  --location=global --display-name="DriftGuard"

# Grant DriftGuard's principal read-only viewer on the project
gcloud projects add-iam-policy-binding acme-prod \\
  --role=roles/viewer \\
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/driftguard/*"`;

const CONFIG = `# .github/driftguard.yml
integrations:
  gcp:
    project_id: acme-prod
    workload_identity_provider: projects/PROJECT_NUM/locations/global/workloadIdentityPools/driftguard/providers/github
    state_backend: gs://acme-tfstate/prod/default.tfstate`;

export default async function Gcp() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.gcp.title"), path: "/docs/gcp" },
      ])}
      eyebrow={t("docs.gcp.eyebrow")}
      title={t("docs.gcp.title")}
      subtitle={t("docs.gcp.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.gcp.keylessTitle")}</h2>
          <p>{t("docs.gcp.keylessBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.gcp.step1Title")}</h2>
          <p>{t("docs.gcp.step1Body")}</p>
          <div className="mt-3">
            <CodeBlock code={WIF} filename="setup.sh" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.gcp.step2Title")}</h2>
          <p>{t("docs.gcp.step2Body")}</p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
          <p className="mt-3">{t("docs.gcp.step2Footer")}</p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
