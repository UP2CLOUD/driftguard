import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { enable } = await req.json().catch(() => ({ enable: false }));
  const res = NextResponse.json({ ok: true });
  if (enable) {
    res.cookies.set("dg_demo", "1", { path: "/", maxAge: 60 * 60 * 24 });
  } else {
    res.cookies.delete("dg_demo");
  }
  return res;
}
