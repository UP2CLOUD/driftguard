export const currencies = [
  "USD",
  "EUR",
  "GBP",
  "BRL",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "INR",
  "CNY",
] as const;

export type CurrencyCode = (typeof currencies)[number];

export const defaultCurrency: CurrencyCode = "USD";

export const currencyCookieName = "dg_currency";

export const currencyLabels: Record<CurrencyCode, string> = {
  USD: "US Dollar (USD)",
  EUR: "Euro (EUR)",
  GBP: "British Pound (GBP)",
  BRL: "Brazilian Real (BRL)",
  JPY: "Japanese Yen (JPY)",
  CAD: "Canadian Dollar (CAD)",
  AUD: "Australian Dollar (AUD)",
  CHF: "Swiss Franc (CHF)",
  INR: "Indian Rupee (INR)",
  CNY: "Chinese Yuan (CNY)",
};

export function isCurrency(value: string): value is CurrencyCode {
  return (currencies as readonly string[]).includes(value);
}
