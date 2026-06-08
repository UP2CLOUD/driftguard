import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";

export async function MarketingFooter() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  return (
    <footer className="border-t border-border bg-canvas py-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 font-mono text-2xs text-fg-subtle">
        {/* eslint-disable-next-line react/jsx-no-literals */}
        <div>© 2026 Driftguard · UP2CLOUD</div>
        <div className="flex gap-4">
          <a href="https://github.com/UP2CLOUD/driftguard" className="transition hover:text-fg-muted">
            {/* eslint-disable-next-line react/jsx-no-literals */}
            GitHub
          </a>
          <Link href="/privacy" className="transition hover:text-fg-muted">
            {t("common.privacy")}
          </Link>
          <Link href="/terms" className="transition hover:text-fg-muted">
            {t("common.terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
