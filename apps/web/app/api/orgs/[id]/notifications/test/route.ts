import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { body, status } = await beProxy(`/api/v1/orgs/${id}/notifications/test`, {
    method: "POST",
    timeout: 10000,
  });
  if (body === null) return new NextResponse(null, { status });
  return NextResponse.json(body, { status });
}
