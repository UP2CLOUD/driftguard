import "server-only";
import { createHmac } from "crypto";

const SECRET = process.env.SECRET_KEY || "dev-only-change-me";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Mint a short-lived HS256 JWT the backend RBAC middleware accepts
 * (see apps/api/driftguard/middleware/rbac.py::_resolve_jwt).
 * Server-side only — SECRET_KEY never reaches the client.
 */
export function mintBackendJwt(params: {
  orgId: string;
  userId: string;
  role?: "org:viewer" | "org:member" | "org:admin";
  ttlSeconds?: number;
}): string {
  if (process.env.VERCEL_ENV === "production" && SECRET === "dev-only-change-me") {
    throw new Error("SECRET_KEY is using the insecure default in production.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: params.userId,
      org_id: params.orgId,
      role: params.role ?? "org:admin",
      iat: now,
      exp: now + (params.ttlSeconds ?? 60),
    })
  );
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}
