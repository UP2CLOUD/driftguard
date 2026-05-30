import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export const dynamic = "force-dynamic";

function warmupApi(installationId: string) {
  if (!BACKEND_URL) return;
  const fire = (path: string) =>
    fetch(`${BACKEND_URL}${path}`, { headers: authHeaders(), keepalive: true }).catch(() => {});

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
