import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";
import { checkInstallationAccess } from "@/lib/auth-utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  let installationId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body.installationId === "string") installationId = body.installationId;
  } catch {
    // No/invalid JSON body — installationId stays undefined, request is rejected below.
  }
  if (!installationId) {
    return NextResponse.json({ error: "installationId required" }, { status: 400 });
  }

  const { authorized } = await checkInstallationAccess(installationId);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { body: data, status } = await beProxy(
    `/api/v1/repos/${repoId}/disable?installation_id=${encodeURIComponent(installationId)}`,
    { method: "POST", timeout: 8000 },
  );
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
