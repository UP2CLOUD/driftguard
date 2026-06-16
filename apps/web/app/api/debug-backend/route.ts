import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_API_URL || "(not set — using http://localhost:8000)";
  const secret = process.env.SECRET_KEY ?? "";
  const secretHint = secret ? `${secret.slice(0, 6)}…(len=${secret.length})` : "(not set)";

  const { searchParams } = new URL(req.url);
  const installationId = searchParams.get("installation_id") ?? "1";

  let health: unknown = null;
  let healthStatus = 0;
  try {
    const r = await fetch(`${url}/api/v1/health`, {
      signal: AbortSignal.timeout(5000),
    });
    healthStatus = r.status;
    health = await r.json();
  } catch (e: unknown) {
    health = String(e);
  }

  let overview: unknown = null;
  let overviewStatus = 0;
  try {
    const r = await fetch(`${url}/api/v1/dashboard/overview?installation_id=${installationId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10000),
    });
    overviewStatus = r.status;
    overview = await r.json().catch(() => r.statusText);
  } catch (e: unknown) {
    overview = String(e);
  }

  let orgs: unknown = null;
  let orgsStatus = 0;
  try {
    const r = await fetch(`${url}/api/v1/orgs/by-user?login=debug`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    orgsStatus = r.status;
    orgs = await r.json().catch(() => r.statusText);
  } catch (e: unknown) {
    orgs = String(e);
  }

  return NextResponse.json({
    apiUrl: url,
    secretHint,
    health: { status: healthStatus, body: health },
    overview: { status: overviewStatus, installationId, body: overview },
    orgs: { status: orgsStatus, body: orgs },
  });
}
