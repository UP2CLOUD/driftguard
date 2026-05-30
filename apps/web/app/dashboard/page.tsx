import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { signOutToHome } from "@/lib/auth-actions";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { getInstallations } from "@/lib/installations";
import { DashboardFooter } from "@/components/DashboardFooter";
import { getUserPreferences } from "@/lib/preferences/server";
import { cookies } from "next/headers";
import Link from "next/link";

const LAST_INSTALLATION_COOKIE = "dg_installation";

export default async function DashboardRoot({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string; setup_action?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  // GitHub posts installation_id after the user installs / re-selects repos
  const sp = await searchParams;
  if (sp.installation_id) {
    redirect(`/dashboard/${sp.installation_id}`);
  }

  const installations = await getInstallations(session);
  if (installations.length === 1) redirect(`/dashboard/${installations[0].id}`);

  // API offline fallback: honour the last-known installation cookie so returning
  // users don't land on the install page when the backend is temporarily down.
  if (installations.length === 0) {
    const jar = await cookies();
    const cached = jar.get(LAST_INSTALLATION_COOKIE)?.value;
    if (cached && /^\d+$/.test(cached)) {
      redirect(`/dashboard/${cached}`);
    }
  }

  const installUrl = getGitHubAppInstallUrl();

  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
              <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
            </svg>
            <span className="font-sans text-[15px] font-semibold tracking-tight text-[color:var(--dg-fg)]">driftguard</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-mono text-[11px] text-[color:var(--dg-fg-subtle)] truncate max-w-[200px]">
              {session.user?.email}
            </span>
            <form action={signOutToHome}>
              <button type="submit" className="dg-button dg-button-ghost text-[12px]">
                {t("nav.signOut") ?? "Sign out"}
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 dg-grid dg-vignette relative">
        <div className="dg-grain absolute inset-0" />
        {installations.length === 0 ? (
          <div className="relative max-w-md w-full rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-8 text-center">
            <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-electric)]/10">
              <svg className="h-5 w-5 text-[color:var(--dg-electric-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <div className="dg-label mb-2">{t("installApp.setup") ?? "Setup required"}</div>
            <h1 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-3">
              {t("installApp.title") ?? "Install the GitHub App"}
            </h1>
            <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)] mb-6">
              {t("installApp.body") ?? "To start reviewing Terraform PRs, install the Driftguard GitHub App on your organization or repository."}
            </p>

            <a href={installUrl} className="dg-button dg-button-primary w-full justify-center text-[13px]">
              {t("installApp.cta") ?? "Install GitHub App →"}
            </a>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {t("installApp.hint") ?? "Takes 30 seconds. No credit card required."}
            </p>
          </div>
        ) : (
          <div className="relative max-w-md w-full rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5">
              <div className="dg-label">{t("installApp.selectOrg") ?? "Select organization"}</div>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {installations.map((inst: any) => (
                <Link
                  key={inst.id}
                  href={`/dashboard/${inst.id}`}
                  className="group flex items-center justify-between gap-3 p-4 hover:bg-[color:var(--dg-surface-raised)] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {inst.account?.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.account.avatar_url}
                        alt={inst.account.login}
                        className="w-7 h-7 rounded border border-[color:var(--dg-border)]"
                      />
                    )}
                    <span className="font-mono text-[13px] font-medium text-[color:var(--dg-fg)] group-hover:text-[color:var(--dg-electric-bright)] transition truncate">
                      {inst.account?.login ?? inst.id}
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

      <DashboardFooter />
    </main>
  );
}
