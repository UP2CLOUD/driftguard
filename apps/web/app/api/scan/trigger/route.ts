import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { body: data, status } = await beProxy(`/api/v1/scans/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000,
  });
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
