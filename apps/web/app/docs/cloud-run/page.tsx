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
    path:        "/docs/cloud-run",
    locale,
    title:       "Cloud Run deployment — DriftGuard",
    description: "Deploy the DriftGuard API to Google Cloud Run: build the container, wire Secret Manager, and connect Cloud SQL and Memorystore.",
  });
}

const BUILD = `# Build and push the API image to Artifact Registry
gcloud builds submit apps/api \\
  --tag europe-west1-docker.pkg.dev/PROJECT/driftguard/api:latest`;

const DEPLOY = `gcloud run deploy driftguard-api \\
  --image europe-west1-docker.pkg.dev/PROJECT/driftguard/api:latest \\
  --region europe-west1 \\
  --port 8000 \\
  --no-allow-unauthenticated=false \\
  --set-env-vars ENVIRONMENT=production \\
  --set-secrets \\
    SECRET_KEY=driftguard-secret-key:latest,\\
    DATABASE_URL=driftguard-database-url:latest,\\
    REDIS_URL=driftguard-redis-url:latest,\\
    GITHUB_APP_PRIVATE_KEY=driftguard-gh-key:latest,\\
    GITHUB_WEBHOOK_SECRET=driftguard-gh-webhook:latest,\\
    ANTHROPIC_API_KEY=driftguard-anthropic:latest \\
  --set-env-vars GITHUB_APP_ID=123456`;

export default async function CloudRun() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.cloudRun.title"), path: "/docs/cloud-run" },
      ])}
      eyebrow={t("docs.cloudRun.eyebrow")}
      title={t("docs.cloudRun.title")}
      subtitle={t("docs.cloudRun.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.cloudRun.needTitle")}</h2>
          <p>{t("docs.cloudRun.needBody")}</p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.cloudRun.step1Title")}</h2>
          <div className="mt-3">
            <CodeBlock code={BUILD} filename="build.sh" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">{t("docs.cloudRun.step2Title")}</h2>
          <p>{t("docs.cloudRun.step2Body")}</p>
          <div className="mt-3">
            <CodeBlock code={DEPLOY} filename="deploy.sh" />
          </div>
          <p className="mt-3">
            {(() => {
              const [pre, post] = t("docs.cloudRun.step2Footer").split("{envLink}");
              return (
                <>
                  {pre}
                  <a href="/docs/env" className="text-[color:var(--dg-electric-bright)] hover:underline">{t("docs.cloudRun.envLinkText")}</a>
                  {post}
                </>
              );
            })()}
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
