import { NextResponse } from "next/server";

export const runtime = "edge";

const rateMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const e   = rateMap.get(ip);
  if (!e || now > e.reset) { rateMap.set(ip, { count: 1, reset: now + windowMs }); return true; }
  if (e.count >= limit) return false;
  e.count++; return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           ?? req.headers.get("x-real-ip")
           ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    console.log("waitlist signup (no resend configured):", email);
    return NextResponse.json({ ok: true });
  }

  const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (!r.ok && r.status !== 409) {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
