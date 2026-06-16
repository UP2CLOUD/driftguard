import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { beProxy } from "@/lib/backend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { installation_id, ...policy } = body;

  if (!installation_id) return NextResponse.json({ error: "installation_id required" }, { status: 400 });

  const { body: data, status } = await beProxy(
    `/api/v1/policies?installation_id=${installation_id}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy),
    },
  );
  if (data === null) return new NextResponse(null, { status });
  return NextResponse.json(data, { status });
}
