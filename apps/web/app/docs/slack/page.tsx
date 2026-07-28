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
    path:        "/docs/slack",
    locale,
    title:       "Slack alerts — DriftGuard",
    description: "Route DriftGuard review results to Slack via an incoming webhook, with per-severity channel routing for blocks, warnings, and passes.",
  });
}

const CONFIG = `# .github/driftguard.yml
integrations:
  slack:
    enabled: true
    # The webhook URL itself is stored in the dashboard, not in the repo.
    routing:
      block: "#incidents"        # critical / blocked merges
      warn:  "#infra-reviews"    # warnings that still allow merge
      pass:  null                # no message on clean PRs (default)`;

const PAYLOAD = `POST https://hooks.slack.com/services/T…/B…/…
{
  "text": "DriftGuard blocked acme/platform#482",
  "blocks": [
    { "type": "section", "text": {
      "type": "mrkdwn",
      "text": "*BLOCKED* · acme/platform#482\\nPolicy: aws_rds_cluster.prod.delete\\nCost: +$0/mo · Security: 0 high" } }
  ]
}`;

export default async function Slack() {
  const prefs    = await getUserPreferences();
  const messages = await getMessages(prefs.locale);
  const t        = createTranslator(messages);

  return (
    <MarketingPageShell
      jsonLd={jsonLdBreadcrumb([
        { name: "Home", path: "/" },
        { name: "Docs", path: "/docs" },
        { name: t("docs.slack.title"), path: "/docs/slack" },
      ])}
      eyebrow={t("docs.slack.eyebrow")}
      title={t("docs.slack.title")}
      subtitle={t("docs.slack.subtitle")}
      narrow
    >
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Connect a webhook</h2>
          <p>
            DriftGuard posts review results to Slack through an{" "}
            <a href="https://api.slack.com/messaging/webhooks" className="text-[color:var(--dg-electric-bright)] hover:underline">incoming webhook</a>.
            Create the webhook in your Slack workspace, then paste the URL into the dashboard (Settings &rarr; Slack).
            The URL is a secret and is stored server-side — never commit it to your repo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Route by severity</h2>
          <p>
            Once connected, choose which channel receives which severity. Critical blocks can go to your incident
            channel while warnings stay in a quieter review channel:
          </p>
          <div className="mt-3">
            <CodeBlock code={CONFIG} filename=".github/driftguard.yml" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-[color:var(--dg-fg)]">Message shape</h2>
          <p>Each alert is a Block Kit message summarising the decision and the top findings:</p>
          <div className="mt-3">
            <CodeBlock code={PAYLOAD} filename="slack-message.json" />
          </div>
          <p className="mt-3">
            Slack notifications are optional and require dashboard setup for the webhook URL. DriftGuard is in early
            access.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
