import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repoId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const { body: data, status } = await beProxy(`/api/v1/repos/${repoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 8000,
  });
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
