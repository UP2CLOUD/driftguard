import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();

  const { body, status } = await beProxy(`/api/v1/scans/upload`, {
    method: "POST",
    body: formData,
    timeout: 60000,
  });
  if (body === null) return new NextResponse(null, { status });
  return NextResponse.json(body, { status });
}
