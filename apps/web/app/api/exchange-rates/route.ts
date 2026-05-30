import { NextResponse } from "next/server";
import { getUsdExchangeRates } from "@/lib/currency/rates";

const rateMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const e   = rateMap.get(ip);
  if (!e || now > e.reset) { rateMap.set(ip, { count: 1, reset: now + windowMs }); return true; }
  if (e.count >= limit) return false;
  e.count++; return true;
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const rates = await getUsdExchangeRates();
  return NextResponse.json(
    { base: "USD", rates, cached: true },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
