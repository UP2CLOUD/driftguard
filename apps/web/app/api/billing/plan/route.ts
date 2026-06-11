import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { beGet } from "@/lib/backend";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const installationId = searchParams.get("installationId");
  if (!installationId) {
    return NextResponse.json({ error: "Missing installationId" }, { status: 400 });
  }

  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plan = await beGet(`/api/v1/billing/plan?installation_id=${installationId}`);
  if (!plan) {
    return NextResponse.json({ error: "Could not load plan" }, { status: 502 });
  }

  return NextResponse.json(plan);
}
