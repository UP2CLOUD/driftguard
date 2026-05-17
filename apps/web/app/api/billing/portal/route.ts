import { NextResponse } from "next/server";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { internalOpenPortal } from "@/lib/api";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, installationId } = await req.json();

    if (!orgId || !installationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { authorized } = await checkInstallationAccess(installationId);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await internalOpenPortal(orgId);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Error in portal route:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
