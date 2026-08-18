import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { Reveal } from "@/components/marketing/Reveal";

export async function MarketingFooter() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  return (
    <footer className="border-t border-border bg-canvas py-6">
      {/* Clean, subtle reveal — small distance, no scale/rotation. Links
          are real anchors from first paint, so they're clickable and
          crawlable regardless of animation state. */}
      <Reveal
        distance={6}
        className="mx-auto flex max-w-7xl items-center justify-between px-4 font-mono text-2xs text-fg-subtle"
      >
        <div>
          © 2026 Driftguard ·{" "}
          <a
            href="https://up2cloud.tech/"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-fg-muted active:text-fg-muted"
          >
            UP2CLOUD
          </a>
          {/* Rendered only when NEXT_PUBLIC_LEGAL_ADDRESS is configured --
              an address is a legal fact, so no placeholder is shipped. */}
          {process.env.NEXT_PUBLIC_LEGAL_ADDRESS ? (
            <span className="ml-1 hidden sm:inline">· {process.env.NEXT_PUBLIC_LEGAL_ADDRESS}</span>
          ) : null}
        </div>
        <div className="flex gap-4">
          <a href="https://github.com/UP2CLOUD/driftguard" className="transition hover:text-fg-muted active:text-fg-muted">
            GitHub
          </a>
          <Link href="/privacy" className="transition hover:text-fg-muted active:text-fg-muted">
            {t("common.privacy")}
          </Link>
          <Link href="/terms" className="transition hover:text-fg-muted active:text-fg-muted">
            {t("common.terms")}
          </Link>
        </div>
      </Reveal>
    </footer>
  );
}
