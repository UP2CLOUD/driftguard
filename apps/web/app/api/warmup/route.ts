import { NextResponse } from "next/server";

export async function GET() {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const r = await fetch(`${api}/api/v1/health`, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    return NextResponse.json({ ok: r.ok, status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
