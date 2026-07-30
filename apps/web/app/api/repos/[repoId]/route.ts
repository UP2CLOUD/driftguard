import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";
import { checkInstallationAccess } from "@/lib/auth-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repoId } = await params;
  let body: { installationId?: unknown; [key: string]: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { installationId, ...forwardedBody } = body;
  if (typeof installationId !== "string" || !installationId) {
    return NextResponse.json({ error: "installationId required" }, { status: 400 });
  }

  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body: data, status } = await beProxy(
    `/api/v1/repos/${repoId}?installation_id=${encodeURIComponent(installationId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardedBody),
      timeout: 8000,
    },
  );
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
