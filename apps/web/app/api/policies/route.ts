import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { installation_id, ...policy } = body;

  if (!installation_id) return NextResponse.json({ error: "installation_id required" }, { status: 400 });

  const res = await fetch(
    `${BACKEND_URL}/api/v1/policies?installation_id=${installation_id}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(policy),
      signal: AbortSignal.timeout(10000),
    },
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
