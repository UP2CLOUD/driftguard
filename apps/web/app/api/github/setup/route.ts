import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  const installationId = req.nextUrl.searchParams.get("installation_id");
  const setupAction = req.nextUrl.searchParams.get("setup_action");

  // GitHub sends installation_id after install/update
  if (installationId) {
    if (!session) {
      // Not logged in — redirect to home with installation_id stored in cookie
      redirect(`/?installation_id=${installationId}`);
    }
    redirect(`/dashboard/${installationId}`);
  }

  // Fallback
  redirect("/dashboard");
}
