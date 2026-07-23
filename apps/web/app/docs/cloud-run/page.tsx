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
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">What you need</h2>
          <p>
            Cloud Run runs the same container as any other deployment. For a managed GCP stack, pair it with Cloud SQL
            (Postgres) for <code className="font-mono text-[color:var(--dg-electric-bright)]">DATABASE_URL</code> and
            Memorystore (Redis) for <code className="font-mono text-[color:var(--dg-electric-bright)]">REDIS_URL</code>,
            and keep every secret in Secret Manager.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">1. Build the image</h2>
          <div className="mt-3">
            <CodeBlock code={BUILD} filename="build.sh" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">2. Deploy</h2>
          <p>Mount secrets from Secret Manager rather than passing them inline:</p>
          <div className="mt-3">
            <CodeBlock code={DEPLOY} filename="deploy.sh" />
          </div>
          <p className="mt-3">
            Point the service URL at your GitHub App webhook (
            <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/webhooks/github</code>). Because
            Cloud Run scales to zero, cold starts add latency to the first webhook after idle — keep a minimum instance
            warm for production. See the full{" "}
            <a href="/docs/env" className="text-[color:var(--dg-electric-bright)] hover:underline">environment variable</a> reference.
            DriftGuard is in early access; this is a reference deployment, not a managed offering.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
