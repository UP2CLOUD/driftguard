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
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
