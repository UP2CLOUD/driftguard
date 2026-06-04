import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const res = await fetch(`${BACKEND_URL}/api/v1/scans/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
