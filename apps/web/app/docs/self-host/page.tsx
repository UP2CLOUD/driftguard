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
    path:        "/docs/self-host",
    locale,
    title:       "Self-hosted deployment — DriftGuard",
    description: "Run the DriftGuard API in your own infrastructure with Docker or Helm. Requires Postgres, Redis, and a GitHub App.",
  });
}

const DOCKER = `# Build from the API package
docker build -t driftguard-api apps/api

docker run -p 8000:8000 \\
  -e DATABASE_URL=postgres://user:pass@db:5432/driftguard \\
  -e REDIS_URL=redis://redis:6379/0 \\
  -e SECRET_KEY=$(openssl rand -hex 32) \\
  -e GITHUB_APP_ID=123456 \\
  -e GITHUB_APP_PRIVATE_KEY="$(cat app.pem)" \\
  -e GITHUB_WEBHOOK_SECRET=whsec_… \\
  -e ANTHROPIC_API_KEY=sk-ant-… \\
  driftguard-api`;

const HELM = `helm install driftguard ./charts/driftguard \\
  --namespace driftguard --create-namespace \\
  --set image.tag=latest \\
  --set env.GITHUB_APP_ID=123456 \\
  --set externalSecrets.enabled=true      # pull SECRET_KEY, keys, DSN from your secret store

# Postgres + Redis are dependencies — point at managed services in production.`;

export default async function SelfHost() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.selfHost.title"), path: "/docs/self-host" },
      ])}
      eyebrow={t("docs.selfHost.eyebrow")}
      title={t("docs.selfHost.title")}
      subtitle={t("docs.selfHost.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Architecture</h2>
          <p>
            The API is a single container built from <code className="font-mono text-[color:var(--dg-electric-bright)]">apps/api/Dockerfile</code>.
            It needs three things at runtime: a Postgres database, a Redis instance for the job queue, and a GitHub
            App so it can receive webhooks and post checks. Anthropic powers the AI review. See{" "}
            <a href="/docs/env" className="text-[color:var(--dg-electric-bright)] hover:underline">environment variables</a> for
            the full list.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Docker</h2>
          <p>The fastest way to run a single instance. Migrations run on startup:</p>
          <div className="mt-3">
            <CodeBlock code={DOCKER} filename="run.sh" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Helm (Kubernetes)</h2>
          <p>
            For production, deploy the container to your cluster and wire secrets from your secret store rather than
            passing them on the command line:
          </p>
          <div className="mt-3">
            <CodeBlock code={HELM} filename="install.sh" />
          </div>
          <p className="mt-3">
            DriftGuard is in early access — self-hosting is intended for teams comfortable operating a Python service
            with Postgres and Redis. Point the GitHub App&rsquo;s webhook URL at your instance&rsquo;s{" "}
            <code className="font-mono text-[color:var(--dg-electric-bright)]">/api/v1/webhooks/github</code>.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
