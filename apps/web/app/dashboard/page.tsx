import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { signOutToHome } from "@/lib/auth-actions";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { StatusBar } from "@/components/landing/StatusBar";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";

export default async function DashboardRoot() {
  const session = await auth();
  if (!session) redirect("/");

  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const { installations } = await checkInstallationAccess("dummy");
  if (installations.length === 1) redirect(`/dashboard/${installations[0].id}`);

  const installUrl = getGitHubAppInstallUrl();

  return (
    <main className="relative min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <StatusBar />
      <nav className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
              <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
            </svg>
            <span className="font-sans text-[15px] font-semibold tracking-tight text-[color:var(--dg-fg)]">driftguard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hidden sm:inline">{session.user?.email}</span>
            <form action={signOutToHome}>
              <button type="submit" className="dg-button dg-button-ghost text-[12px]">{t("nav.signOut") || "Sign out"}</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 dg-grid dg-vignette relative">
        <div className="dg-grain absolute inset-0" />
        {installations.length === 0 ? (
          <div className="max-w-md w-full rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6 sm:p-8 text-center relative">
            <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10">
              <svg className="h-5 w-5 text-[color:var(--dg-electric-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="dg-label">Setup required</div>
            <h1 className="mt-2 font-sans text-xl sm:text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
              {t("installApp.title") || "Install the GitHub App"}
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
              {t("installApp.body") || "To start reviewing Terraform PRs, install the Driftguard GitHub App on your organization or repository."}
            </p>
            <a href={installUrl} className="mt-6 dg-button dg-button-primary text-[12px] w-full justify-center">
              {t("installApp.cta") || "Install GitHub App →"}
            </a>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {t("installApp.hint") || "Takes 30 seconds. No credit card required."}
            </p>
          </div>
        ) : (
          <div className="max-w-md w-full rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden relative">
            <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5">
              <div className="dg-label">{t("installApp.selectOrg") || "Select organization"}</div>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {installations.map((inst: any) => (
                <Link
                  key={inst.id}
                  href={`/dashboard/${inst.id}`}
                  className="group flex items-center justify-between gap-3 p-4 hover:bg-[color:var(--dg-surface-raised)] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {inst.account.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={inst.account.avatar_url} alt={inst.account.login}
                        className="w-7 h-7 rounded border border-[color:var(--dg-border)]" />
                    )}
                    <span className="font-mono text-[13px] font-medium text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition truncate">
                      {inst.account.login}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] group-hover:text-[color:var(--dg-electric-bright)] transition shrink-0">
                    Enter →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
