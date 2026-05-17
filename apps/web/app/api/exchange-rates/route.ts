import { NextResponse } from "next/server";
import { getUsdExchangeRates } from "@/lib/currency/rates";

export async function GET() {
  const rates = await getUsdExchangeRates();
  return NextResponse.json({
    base: "USD",
    rates,
    cached: true,
  });
}
