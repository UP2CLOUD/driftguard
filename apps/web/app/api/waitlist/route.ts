import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
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
