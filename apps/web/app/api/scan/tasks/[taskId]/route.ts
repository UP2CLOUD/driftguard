import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const res = await fetch(`${BACKEND_URL}/api/v1/scans/tasks/${taskId}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
