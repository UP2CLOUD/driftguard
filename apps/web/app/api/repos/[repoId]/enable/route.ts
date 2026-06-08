import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  const res = await fetch(`${BACKEND_URL}/api/v1/repos/${repoId}/enable`, {
    method: "POST",
    headers: authHeaders(),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
