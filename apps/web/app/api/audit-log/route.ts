import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const installationId = searchParams.get("installation_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500);
  const format = searchParams.get("format"); // "csv"

  if (!installationId) {
    return NextResponse.json({ error: "installation_id required" }, { status: 400 });
  }

  // Resolve org_id from installation
  const orgRes = await fetch(
    `${BACKEND_URL}/api/v1/orgs/by-installation/${installationId}`,
    { headers: authHeaders(), signal: AbortSignal.timeout(8000) }
  ).catch(() => null);
  if (!orgRes?.ok) {
    return NextResponse.json({ error: "org not found" }, { status: 404 });
  }
  const org = (await orgRes.json()) as { id?: string };
  if (!org?.id) return NextResponse.json({ error: "org not found" }, { status: 404 });

  const res = await fetch(
    `${BACKEND_URL}/api/v1/orgs/${org.id}/audit-log?limit=${limit}`,
    { headers: authHeaders(), signal: AbortSignal.timeout(10000) }
  ).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });

  const rows = (await res.json()) as Array<{
    id: string;
    actor: string;
    action: string;
    target: string | null;
    payload: unknown;
    created_at: string | null;
  }>;

  if (format === "csv") {
    const header = "id,actor,action,target,payload,created_at\n";
    const body = rows
      .map((r) =>
        [
          r.id,
          `"${(r.actor ?? "").replace(/"/g, '""')}"`,
          `"${(r.action ?? "").replace(/"/g, '""')}"`,
          `"${(r.target ?? "").replace(/"/g, '""')}"`,
          `"${JSON.stringify(r.payload ?? {}).replace(/"/g, '""')}"`,
          r.created_at ?? "",
        ].join(",")
      )
      .join("\n");

    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${installationId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(rows);
}
