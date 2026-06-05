import { NextResponse } from "next/server";

const started = Date.now();

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  let backendStatus = "not_configured";
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/health`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      backendStatus = res.ok ? "ok" : `error_${res.status}`;
    } catch {
      backendStatus = "unreachable";
    }
  }

  return NextResponse.json({
    status: "ok",
    uptime_ms: Date.now() - started,
    version: "0.1.0-beta",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: process.env.NODE_ENV,
    backend: backendStatus,
  });
}
