import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const installationId = req.nextUrl.searchParams.get("installation_id");
  if (!installationId) return NextResponse.json({ error: "installation_id required" }, { status: 400 });

  const { body: data, status } = await beProxy(
    `/api/v1/finops/dashboard?installation_id=${installationId}`,
    { method: "GET" },
  );
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
