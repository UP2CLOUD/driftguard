import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const { body, status } = await beProxy(`/api/v1/scans/tasks/${taskId}`, { method: "GET", timeout: 5000 });
  if (body === null) return new NextResponse(null, { status });
  return NextResponse.json(body, { status });
}
