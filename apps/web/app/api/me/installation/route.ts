import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInstallations } from "@/lib/installations";
import { beGet } from "@/lib/backend";

/** Resolve the current user's installation and org_id for checkout. */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installations = await getInstallations(session);
  const installation = installations[0];
  if (!installation) {
    return NextResponse.json({ orgId: null, installationId: null });
  }

  const data = await beGet<{ id: string }>(`/api/v1/orgs/by-installation/${installation.id}`, { timeout: 3000 });
  if (!data) {
    return NextResponse.json({ orgId: null, installationId: installation.id });
  }
  return NextResponse.json({ orgId: data.id, installationId: installation.id });
}
