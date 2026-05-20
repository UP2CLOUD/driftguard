import { auth } from "@/auth";
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardFooter } from "@/components/DashboardFooter";
import { redirect } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <DashboardNav installationId={installationId} />
      <main className="flex-1">{children}</main>
      <DashboardFooter />
    </div>
  );
}
