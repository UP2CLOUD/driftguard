import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { listTokens } from "./actions";
import { TokenManager } from "./TokenManager";

export default async function TokensPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const tokens = await listTokens(installationId);

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 space-y-8">
      <div>
        <Link
          href={`/dashboard/${installationId}/settings`}
          className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
        >
          ← {t("settings.title") ?? "Settings"}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[color:var(--dg-fg)]">
          {t("tokens.title") ?? "API tokens"}
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("tokens.subtitle") ??
            "Tokens authenticate CI pipelines and scripts against the DriftGuard REST API. The secret is shown once at creation."}
        </p>
      </div>

      <TokenManager
        installationId={installationId}
        initialTokens={tokens}
        labels={{
          name: t("tokens.nameLabel") ?? "Token name",
          namePlaceholder: t("tokens.namePlaceholder") ?? "ci-pipeline",
          role: t("tokens.roleLabel") ?? "Role",
          create: t("tokens.create") ?? "Create token",
          creating: t("tokens.creating") ?? "Creating…",
          copyHint:
            t("tokens.copyHint") ??
            "Copy this token now — it will not be shown again.",
          copy: t("tokens.copy") ?? "Copy",
          copied: t("tokens.copied") ?? "Copied",
          empty: t("tokens.empty") ?? "No tokens yet. Create one to call the REST API.",
          revoke: t("tokens.revoke") ?? "Revoke",
          revoked: t("tokens.revokedBadge") ?? "revoked",
          lastUsed: t("tokens.lastUsed") ?? "last used",
          never: t("tokens.never") ?? "never",
          created: t("tokens.createdLabel") ?? "created",
          loadError:
            t("tokens.loadError") ??
            "Could not load tokens — the API may be unreachable.",
          confirmRevoke:
            t("tokens.confirmRevoke") ??
            "Revoke this token? Scripts using it will stop working immediately.",
          usageTitle: t("tokens.usageTitle") ?? "Usage",
        }}
      />
    </div>
  );
}
