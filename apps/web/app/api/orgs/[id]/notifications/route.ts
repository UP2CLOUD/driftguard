import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const res = await fetch(`${BACKEND_URL}/api/v1/orgs/${id}/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
