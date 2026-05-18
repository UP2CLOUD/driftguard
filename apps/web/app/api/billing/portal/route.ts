import { NextResponse } from "next/server";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { ApiError, internalOpenPortal } from "@/lib/api";
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

    const email = session.user?.email ?? null;
    const url = await internalOpenPortal(orgId, email);
    return NextResponse.json({ url });
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      console.error("Billing portal API error:", err.status, err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in portal route:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
