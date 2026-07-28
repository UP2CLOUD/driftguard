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
    path:        "/docs/azure",
    locale,
    title:       "Azure integration — DriftGuard",
    description: "Connect Azure to DriftGuard with federated workload identity credentials — keyless, read-only drift detection against your live Azure state.",
  });
}

const FED = `# Register an app + service principal, then add a federated credential
az ad app create --display-name DriftGuard
az ad app federated-credential create --id APP_ID --parameters @fed.json

# Grant read-only Reader on the subscription
az role assignment create \\
  --assignee APP_ID \\
  --role Reader \\
  --scope /subscriptions/SUBSCRIPTION_ID`;

const CONFIG = `# .github/driftguard.yml
integrations:
  azure:
    subscription_id: 00000000-0000-0000-0000-000000000000
    tenant_id: 11111111-1111-1111-1111-111111111111
    client_id: 22222222-2222-2222-2222-222222222222   # the federated app
    state_backend: https://acmetfstate.blob.core.windows.net/tfstate/prod.tfstate`;

export default async function Azure() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.azure.title"), path: "/docs/azure" },
      ])}
      eyebrow={t("docs.azure.eyebrow")}
      title={t("docs.azure.title")}
      subtitle={t("docs.azure.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Federated, keyless access</h2>
          <p>
            DriftGuard authenticates to Azure using a federated workload identity credential on an app registration —
            no client secrets stored anywhere. Drift detection needs only the built-in
            <code className="font-mono text-[color:var(--dg-electric-bright)]"> Reader</code> role to compare your plan
            against live resources.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">1. Register the identity</h2>
          <p>Create the app registration, add the federated credential DriftGuard shows you, and assign Reader:</p>
          <div className="mt-3">
            <CodeBlock code={FED} filename="setup.sh" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">2. Register in DriftGuard</h2>
          <p>
            Save the subscription, tenant, and client IDs plus the Blob Storage state backend in the dashboard
            (Settings &rarr; Azure). The repo config records which subscription and state DriftGuard reads:
          </p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
          <p className="mt-3">
            Azure access is optional and read-only; it powers live-state drift detection only. DriftGuard is in early
            access.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
