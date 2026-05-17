import { unstable_cache } from "next/cache";
import type { CurrencyCode } from "./config";
import { currencies } from "./config";

/** Static fallback when Frankfurter is unavailable (USD base). */
export const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.05,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  INR: 83.1,
  CNY: 7.24,
};

type FrankfurterResponse = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

async function fetchFrankfurterRates(): Promise<Record<CurrencyCode, number>> {
  const symbols = currencies.filter((c) => c !== "USD").join(",");
  const url = `https://api.frankfurter.app/latest?from=USD&to=${symbols}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = (await res.json()) as FrankfurterResponse;
    const rates = { USD: 1 } as Record<CurrencyCode, number>;
    for (const code of currencies) {
      if (code === "USD") continue;
      rates[code] = data.rates[code] ?? FALLBACK_USD_RATES[code];
    }
    return rates;
  } catch {
    return { ...FALLBACK_USD_RATES };
  }
}

export const getUsdExchangeRates = unstable_cache(
  fetchFrankfurterRates,
  ["usd-exchange-rates"],
  { revalidate: 86400 }
);
