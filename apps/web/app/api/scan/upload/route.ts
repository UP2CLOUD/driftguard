import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";
import { checkInstallationAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const installationIdField = formData.get("installation_id");
  const installationId = typeof installationIdField === "string" ? installationIdField : undefined;
  if (!installationId) {
    return NextResponse.json({ error: "installation_id required" }, { status: 400 });
  }

  // The session proves *who* is calling; this proves they're actually
  // authorized for the installation the archive is scanned against.
  // Without it, any authenticated user could consume another org's scan
  // quota and have results persisted/attributed under that org, just by
  // guessing/enumerating installation IDs.
  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body, status } = await beProxy(`/api/v1/scans/upload`, {
    method: "POST",
    body: formData,
    timeout: 60000,
  });
  if (body === null) return new NextResponse(null, { status });
  return NextResponse.json(body, { status });
}
