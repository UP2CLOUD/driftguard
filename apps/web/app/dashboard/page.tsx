import { auth, signOut } from "@/auth";
import { checkInstallationAccess } from "@/lib/auth-utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardRoot() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { installations } = await checkInstallationAccess("dummy");

  if (installations.length === 1) {
    redirect(`/dashboard/${installations[0].id}`);
  }

  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL || "https://github.com/apps/driftguard-dev/installations/new";

  return (
    <main className="min-h-screen bg-paper flex flex-col justify-between">
      <nav className="border-b border-ink/10 bg-white/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            driftguard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted font-mono">{session.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-ink/10 hover:border-accent hover:text-accent px-4 py-1.5 text-xs transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        {installations.length === 0 ? (
          <div className="max-w-md w-full bg-white/60 border border-ink/10 rounded-2xl p-8 shadow-xl shadow-ink/5 backdrop-blur-md text-center transform transition duration-500 hover:scale-[1.01]">
            <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Connect to GitHub
            </h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Driftguard needs access to your GitHub repositories to review your OpenTofu/Terraform code and detect drift.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a
                href={githubAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-paper hover:bg-ink transition shadow-lg shadow-accent/20 hover:shadow-ink/20"
              >
                Install Driftguard App
              </a>
            </div>
          </div>
        ) : (
          <div className="max-w-xl w-full bg-white/60 border border-ink/10 rounded-2xl p-8 shadow-xl shadow-ink/5 backdrop-blur-md">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink mb-6 text-center">
              Select Organization
            </h1>
            <p className="text-sm text-muted mb-6 text-center">
              Choose the GitHub organization or account you want to manage.
            </p>
            <div className="grid gap-3">
              {installations.map((inst: any) => (
                <Link
                  key={inst.id}
                  href={`/dashboard/${inst.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-ink/10 bg-white/40 hover:border-accent hover:bg-accent/5 transition group"
                >
                  <div className="flex items-center gap-3">
                    {inst.account.avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.account.avatar_url}
                        alt={inst.account.login}
                        className="w-8 h-8 rounded-full border border-ink/10"
                      />
                    )}
                    <span className="font-mono text-sm font-semibold text-ink group-hover:text-accent transition">
                      {inst.account.login}
                    </span>
                  </div>
                  <span className="text-xs text-muted group-hover:text-accent font-mono transition">
                    Enter →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-ink/10 py-6 bg-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted font-mono">
          <div>© 2026 Driftguard</div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-accent">
              Privacy
            </a>
            <a href="/terms" className="hover:text-accent">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
