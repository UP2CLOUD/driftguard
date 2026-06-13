/**
 * Centralised server-side client for the DriftGuard backend API.
 *
 * All server components and API routes should import authHeaders() / beGet()
 * from here instead of duplicating the API base URL and secret inline.
 */

const BASE   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SECRET = process.env.SECRET_KEY          || "dev-only-change-me";

export const BACKEND_URL = BASE;

export function authHeaders(): Record<string, string> {
  if (process.env.VERCEL_ENV === "production" && SECRET === "dev-only-change-me") {
    throw new Error("SECRET_KEY is using the insecure default in production.");
  }
  return { Authorization: `Bearer ${SECRET}` };
}

/**
 * GET a JSON resource from the backend.
 * Returns null on any error or non-OK response — callers never need try/catch.
 */
export async function beGet<T>(
  path: string,
  { timeout = 5000, revalidate }: { timeout?: number; revalidate?: number } = {},
): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeaders(),
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      console.warn(`[backend] ${res.status} ${res.statusText} — ${BASE}${path}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[backend] fetch failed — ${BASE}${path}`, err);
    return null;
  }
}

/**
 * Like beGet, but also returns the HTTP status code so callers can
 * distinguish auth failures (401) from missing data from network errors (null).
 */
export async function beGetFull<T>(
  path: string,
  { timeout = 5000, revalidate }: { timeout?: number; revalidate?: number } = {},
): Promise<{ data: T | null; status: number | null }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeaders(),
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      console.warn(`[backend] ${res.status} ${res.statusText} — ${BASE}${path}`);
      return { data: null, status: res.status };
    }
    return { data: (await res.json()) as T, status: res.status };
  } catch (err) {
    console.warn(`[backend] fetch failed — ${BASE}${path}`, err);
    return { data: null, status: null };
  }
}
