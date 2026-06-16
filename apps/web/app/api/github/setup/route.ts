import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export const dynamic = "force-dynamic";

function warmupApi(installationId: string) {
  if (!BACKEND_URL) return;
  const fire = (path: string) =>
    fetch(`${BACKEND_URL}${path}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});

  fire(`/api/v1/dashboard/overview?installation_id=${installationId}`);
  fire(`/api/v1/incidents?installation_id=${installationId}&limit=5`);
  fire(`/api/v1/events?installation_id=${installationId}&limit=8`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const installationId = searchParams.get("installation_id");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // GitHub sends ?error=access_denied when the user cancels or denies the install.
  if (error) {
    const msg = errorDescription || error;
    redirect(`/dashboard?setup_error=${encodeURIComponent(msg)}`);
  }

  if (installationId) {
    // Warm-up runs in parallel with auth() — no await
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
