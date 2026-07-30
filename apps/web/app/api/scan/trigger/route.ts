import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";
import { checkInstallationAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const installationId =
    body && typeof body === "object" && "installation_id" in body
      ? String((body as { installation_id: unknown }).installation_id)
      : undefined;
  if (!installationId) {
    return NextResponse.json({ error: "installation_id required" }, { status: 400 });
  }

  // The session proves *who* is calling; this proves they're actually
  // authorized for the installation being scanned. Without it, any
  // authenticated user could trigger a scan — and read back the results,
  // including private source layout and findings — for an installation
  // belonging to a different org, just by guessing/enumerating IDs.
  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body: data, status } = await beProxy(`/api/v1/scans/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000,
  });
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
