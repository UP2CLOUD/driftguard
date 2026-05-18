import { DriftguardLogo } from "@/components/DriftguardLogo";
import { NavSubmitButton } from "@/components/NavButton";
import { auth } from "@/auth";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { signOutToHome } from "@/lib/auth-actions";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardRoot() {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  if (!session) redirect("/");

  const { installations } = await checkInstallationAccess("dummy");

  if (installations.length === 1) {
    redirect(`/dashboard/${installations[0].id}`);
  }

  const installUrl = getGitHubAppInstallUrl();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <DriftguardLogo href="/" />
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-zinc-400">{session.user?.email}</span>
            <form action={signOutToHome}>
              <NavSubmitButton>{t("nav.signOut")}</NavSubmitButton>
            </form>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        {installations.length === 0 ? (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
              <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100 mb-2">
              Install the GitHub App
            </h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              To start reviewing Terraform PRs, install the Driftguard GitHub App
              on your organization or repository.
            </p>
            <a
              href={installUrl}
              className="inline-block rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600"
            >
              Install GitHub App →
            </a>
            <p className="mt-4 text-xs text-zinc-500">
              Takes 30 seconds. No credit card required.
            </p>
          </div>
        ) : (
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h1 className="text-lg font-bold tracking-tight text-zinc-100 mb-4 text-center">
              Select Organization
            </h1>
            <div className="grid gap-2">
              {installations.map((inst: any) => (
                <Link
                  key={inst.id}
                  href={`/dashboard/${inst.id}`}
                  className="flex items-center justify-between p-3 rounded border border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900 transition group"
                >
                  <div className="flex items-center gap-3">
                    {inst.account.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.account.avatar_url}
                        alt={inst.account.login}
                        className="w-6 h-6 rounded border border-zinc-800"
                      />
                    )}
                    <span className="font-mono text-xs font-semibold text-zinc-200 group-hover:text-orange-400 transition">
                      {inst.account.login}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 group-hover:text-orange-400 font-mono transition">
                    Enter →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-zinc-900 py-4 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-[10px] text-zinc-500 font-mono">
          <div>© 2026 Driftguard</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
