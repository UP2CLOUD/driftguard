import { DriftguardLogo } from "@/components/DriftguardLogo";
import { NavAnchor, NavLink, NavSubmitButton } from "@/components/NavButton";
import { auth, signIn } from "@/auth";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { signOutToHome } from "@/lib/auth-actions";

export async function MarketingNav() {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <DriftguardLogo href="/" />
        <div className="flex items-center gap-1 sm:gap-2">
          <NavAnchor href="/#features">{t("nav.features")}</NavAnchor>
          <NavAnchor href="/#pricing">{t("nav.pricing")}</NavAnchor>
          {session ? (
            <>
              <NavLink href="/dashboard">{t("nav.dashboard")}</NavLink>
              <form action={signOutToHome}>
                <NavSubmitButton>{t("nav.signOut")}</NavSubmitButton>
              </form>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-fg px-3 py-1.5 text-sm font-semibold text-canvas transition duration-150 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90"
                >
                  {t("nav.signInGithub")}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("developer-login", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-fg-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90"
                >
                  {t("nav.devBypass")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
