import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import Link from "next/link";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { getUserPreferences } from "@/lib/preferences/server";

export async function DashboardFooter() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  return (
    <footer className="border-t border-[color:var(--dg-border)] mt-auto">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <span>© 2026 UP2CLOUD</span>
          <span className="opacity-40">·</span>
          <Link href="/docs" className="hover:text-[color:var(--dg-fg)] transition">Docs</Link>
          <span className="opacity-40">·</span>
          <Link href="/privacy" className="hover:text-[color:var(--dg-fg)] transition">{t("common.privacy")}</Link>
          <span className="opacity-40">·</span>
          <Link href="/terms" className="hover:text-[color:var(--dg-fg)] transition">{t("common.terms")}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher initialPreferences={preferences} compact label={t("common.language")} />
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
            v0.1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
