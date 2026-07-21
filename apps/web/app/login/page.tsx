import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to DriftGuard — AI runtime safety for Terraform agents.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already authenticated → straight to the dashboard.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const prefs = await getUserPreferences();
  const t = createTranslator(await getMessages(prefs.locale));

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[color:var(--dg-canvas)] px-4">
      {/* Mission-control backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 dg-grid dg-grain opacity-50" />
      <div className="fixed inset-0 pointer-events-none z-0 dg-vignette" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Identity mark */}
        <Link href="/" className="mb-10 flex items-center gap-4 justify-center">
          <div className="relative flex items-center justify-center w-7 h-7">
            <div className="absolute inset-0 border border-[color:var(--dg-electric-bright)] rounded-sm animate-pulse opacity-50" />
            <div className="w-2.5 h-2.5 bg-[color:var(--dg-electric)] rounded-sm shadow-[0_0_8px_var(--dg-electric-bright)]" />
          </div>
          <span className="font-mono text-[15px] font-medium tracking-[0.2em] text-white flex flex-col leading-none">
            DRIFTGUARD
            <span className="text-[8px] text-[color:var(--dg-fg-subtle)] tracking-widest mt-1">
              RUNTIME_LAYER
            </span>
          </span>
        </Link>

        {/* Auth panel */}
        <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/60 backdrop-blur-md p-8">
          <div className="dg-label flex items-center gap-3 mb-3">
            <span className="h-px w-6 bg-[color:var(--dg-electric)]" />
            {t("login.eyebrow") ?? "Access console"}
          </div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white">
            {t("login.title") ?? "Initialize DriftGuard"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
            {t("login.subtitle") ??
              "Authenticate with GitHub to govern your autonomous infrastructure fleet."}
          </p>

          <div className="mt-7">
            <SignInButton
              dataTransition="github"
              className="dg-button dg-button-primary w-full flex items-center justify-center gap-2.5 py-3 font-mono text-[12px] uppercase tracking-widest"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.4-1.27.73-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.28 5.69.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
              </svg>
              {t("login.githubCta") ?? "Sign in with GitHub"}
            </SignInButton>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-[color:var(--dg-fg-subtle)]">
            {t("login.terms") ?? "By continuing you agree to our"}{" "}
            <Link href="/terms" className="text-[color:var(--dg-electric-bright)] hover:underline">
              {t("common.terms") ?? "Terms"}
            </Link>{" "}
            &amp;{" "}
            <Link href="/privacy" className="text-[color:var(--dg-electric-bright)] hover:underline">
              {t("common.privacy") ?? "Privacy"}
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-white transition-colors"
          >
            ← {t("login.backHome") ?? "Back to home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
