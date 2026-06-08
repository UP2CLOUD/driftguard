import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_API_URL || "(not set — using http://localhost:8000)";
  const secret = process.env.SECRET_KEY ?? "";
  const secretHint = secret ? `${secret.slice(0, 6)}…(len=${secret.length})` : "(not set)";

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

  let authed: unknown = null;
  let authedStatus = 0;
  try {
    const r = await fetch(`${url}/api/v1/dashboard/overview?installation_id=1`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    authedStatus = r.status;
    authed = await r.json().catch(() => r.statusText);
  } catch (e: unknown) {
    authed = String(e);
  }

  return NextResponse.json({
    apiUrl: url,
    secretHint,
    health: { status: healthStatus, body: health },
    authedProbe: { status: authedStatus, body: authed },
  });
}
