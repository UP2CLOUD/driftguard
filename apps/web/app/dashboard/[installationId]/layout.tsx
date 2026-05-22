import { auth } from "@/auth";
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardFooter } from "@/components/DashboardFooter";
import { redirect } from "next/navigation";
import { checkInstallationAccess } from "@/lib/auth-utils";

async function fetchOpenIncidents(installationId: string): Promise<number> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(
      `${apiUrl}/api/v1/incidents?installation_id=${installationId}&status=open&limit=1`,
      {
        headers: { Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` },
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(2000),
      }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    // API returns the list; re-fetch count via overview is more accurate
    // but for the badge we just need to know if > 0
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;

  const { authorized, installations } = await checkInstallationAccess(installationId);
  if (!authorized) redirect("/");

  const installation = installations.find((i) => i.id === parseInt(installationId));
  const planLabel = undefined; // fetched per-page for accuracy

  const openIncidents = await fetchOpenIncidents(installationId);

  return (
    <div className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <DashboardNav
        installationId={installationId}
        planLabel={planLabel}
        openIncidents={openIncidents}
      />
      <main className="flex-1">{children}</main>
      <DashboardFooter />
    </div>
  );
}
