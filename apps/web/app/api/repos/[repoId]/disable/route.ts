import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ repoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;
  const { body, status } = await beProxy(`/api/v1/repos/${repoId}/disable`, { method: "POST", timeout: 8000 });
  if (body === null) return new NextResponse(null, { status });
  return NextResponse.json(body, { status });
}
