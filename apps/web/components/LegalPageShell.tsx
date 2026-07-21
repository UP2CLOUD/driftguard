import { TranslationProvider } from "@/components/TranslationProvider";
import { CommandNav } from "@/components/marketing/CommandNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import Link from "next/link";

type LegalPageShellProps = {
  children: React.ReactNode;
  active: "privacy" | "terms";
};

export async function LegalPageShell({ children, active }: LegalPageShellProps) {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  return (
    <TranslationProvider messages={messages as Record<string, unknown>}>
      <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
        <CommandNav />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
          <nav
            aria-label={t("common.legal")}
            className="mb-8 flex items-center gap-3 font-sans font-medium text-[10px] uppercase tracking-widest"
          >
            <span className="h-px w-4 bg-[color:var(--dg-electric)]" />
            <Link
              href="/privacy"
              className={
                active === "privacy"
                  ? "text-[color:var(--dg-electric-bright)]"
                  : "text-[color:var(--dg-fg-subtle)] transition hover:text-[color:var(--dg-fg)]"
              }
            >
              {t("common.privacy")}
            </Link>
            <span className="text-[color:var(--dg-fg-subtle)]">/</span>
            <Link
              href="/terms"
              className={
                active === "terms"
                  ? "text-[color:var(--dg-electric-bright)]"
                  : "text-[color:var(--dg-fg-subtle)] transition hover:text-[color:var(--dg-fg)]"
              }
            >
              {t("common.terms")}
            </Link>
          </nav>

          {children}
        </div>

        <MarketingFooter />
      </main>
    </TranslationProvider>
  );
}
