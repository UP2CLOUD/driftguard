import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function warmupApi(installationId: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const secret = process.env.SECRET_KEY;
  if (!apiUrl || !secret) return;

  const headers = { Authorization: `Bearer ${secret}` };
  const fire = (path: string) =>
    fetch(`${apiUrl}${path}`, { headers, keepalive: true }).catch(() => {});

  fire(`/api/v1/dashboard/overview?installation_id=${installationId}`);
  fire(`/api/v1/incidents?installation_id=${installationId}&limit=5`);
  fire(`/api/v1/events?installation_id=${installationId}&limit=8`);
}

export async function GET(req: NextRequest) {
  const installationId = req.nextUrl.searchParams.get("installation_id");

  if (installationId) {
    // Warm-up corre em paralelo com o auth() — sem await
    warmupApi(installationId);
  }

  const session = await auth();

  if (installationId) {
    if (!session) {
      redirect(`/?installation_id=${installationId}`);
    }
    redirect(`/dashboard/${installationId}`);
  }

  redirect("/dashboard");
}
