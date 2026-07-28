import { NextResponse } from "next/server";

export const runtime = "edge";

const ROLES = [
  "CISO / Security leader",
  "Platform / DevOps engineer",
  "Compliance / Risk / Audit",
  "Engineering leadership",
  "Other",
] as const;

const USE_CASES = [
  "Terraform / OpenTofu PR review",
  "Compliance evidence (DORA / NIS2 / ISO 27001)",
  "Cost governance",
  "Kubernetes / GitHub Actions review",
  "Other",
] as const;

const rateMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string, limit = 3, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.reset) {
    rateMap.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (e.count >= limit) return false;
  e.count++;
  return true;
}

interface BriefingPayload {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  role?: unknown;
  useCase?: unknown;
  context?: unknown;
  website?: unknown; // honeypot — real visitors never fill this in
}

function fieldErrors(body: BriefingPayload): Record<string, string> {
  const errors: Record<string, string> = {};
  if (typeof body.name !== "string" || body.name.trim().length < 1) {
    errors.name = "Enter your full name.";
  }
  if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.email = "Enter a valid work email.";
  }
  if (typeof body.company !== "string" || body.company.trim().length < 1) {
    errors.company = "Enter your company name.";
  }
  if (typeof body.role !== "string" || !ROLES.includes(body.role as (typeof ROLES)[number])) {
    errors.role = "Select a role.";
  }
  if (typeof body.useCase !== "string" || !USE_CASES.includes(body.useCase as (typeof USE_CASES)[number])) {
    errors.useCase = "Select a primary use case.";
  }
  return errors;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: BriefingPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  // Honeypot: a hidden field real visitors never see or fill. Accept
  // silently without sending, so automated fillers get no signal.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const errors = fieldErrors(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "invalid", fields: errors }, { status: 400 });
  }

  const name = (body.name as string).trim();
  const email = (body.email as string).trim();
  const company = (body.company as string).trim();
  const role = body.role as string;
  const useCase = body.useCase as string;
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 2000) : "";

  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.BRIEFING_NOTIFY_EMAIL;

  if (!apiKey || !notifyEmail) {
    console.log("technical briefing request (no resend/notify email configured):", {
      name,
      email,
      company,
      role,
      useCase,
    });
    return NextResponse.json({ ok: true });
  }

  const from = process.env.RESEND_FROM_EMAIL || "DriftGuard <onboarding@resend.dev>";
  const text = [
    `New technical briefing request from driftguard-blue.vercel.app`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    `Role: ${role}`,
    `Primary use case: ${useCase}`,
    context ? `Context: ${context}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let r: Response;
  try {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notifyEmail],
        reply_to: email,
        subject: `Technical briefing request — ${company}`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  if (!r.ok) {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
