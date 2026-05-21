import { NextResponse } from "next/server";

const started = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime_ms: Date.now() - started,
    version: "0.1.0-beta",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: process.env.NODE_ENV,
  });
}
