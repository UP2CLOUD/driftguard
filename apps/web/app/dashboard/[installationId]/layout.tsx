import { checkInstallationAccess } from "@/lib/auth-utils";
import Link from "next/link";
import { signOut } from "@/auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ installationId: string }>;
}) {
  const { installationId } = await params;
  const { authorized } = await checkInstallationAccess(installationId);

  if (!authorized) {
    return (
      <main className="min-h-screen bg-paper flex flex-col justify-between">
        <nav className="border-b border-ink/10 bg-white/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-lg font-bold tracking-tight">
              driftguard
            </Link>
            <div className="flex items-center gap-4">
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
          <div className="max-w-md w-full bg-white/60 border border-red-500/20 rounded-2xl p-8 shadow-xl shadow-red-500/5 backdrop-blur-md text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
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
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Access Denied
            </h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              You do not have access to this organization or installation. Please request access from your team admin or log in to a different account.
            </p>
            <div className="mt-8 flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="w-full inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-accent transition"
              >
                Go to My Organizations
              </Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-ink/10 py-6 bg-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted font-mono">
            <div>© 2026 Driftguard</div>
          </div>
        </footer>
      </main>
    );
  }

  return <>{children}</>;
}
