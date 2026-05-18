import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { DashboardNav } from "@/components/DashboardNav";
import Link from "next/link";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  // Fetch repos for this installation from the API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let repos: any[] = [];
  try {
    const res = await fetch(`${apiUrl}/api/v1/orgs/by-installation/${installationId}`, {
      headers: { Authorization: `Bearer ${process.env.SECRET_KEY}` },
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const org = await res.json();
      const reposRes = await fetch(`${apiUrl}/api/v1/orgs/${org.id}/repos`, {
        headers: { Authorization: `Bearer ${process.env.SECRET_KEY}` },
        next: { revalidate: 30 },
      });
      if (reposRes.ok) repos = await reposRes.json();
    }
  } catch {
    // API not reachable — show empty state
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardNav installationId={installationId} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-lg font-bold tracking-tight text-zinc-100">
          {t("dashboard.repos") ?? "Repositories"}
        </h1>

        {repos.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-sm text-zinc-500">
              No repositories yet. Open a Terraform PR to trigger the first analysis.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {repos.map((repo: any) => (
              <Link
                key={repo.id}
                href={`/dashboard/${installationId}/repos/${repo.github_repo_id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition group"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-zinc-200 group-hover:text-orange-400 transition">
                    {repo.full_name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {repo.enabled ? "Active" : "Disabled"}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 font-mono group-hover:text-orange-400 transition">
                  View →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
