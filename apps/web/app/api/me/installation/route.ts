import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInstallations } from "@/lib/installations";

const API  = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HDRS = () => ({ Authorization: `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}` });

/** Resolve the current user's installation and org_id for checkout. */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installations = await getInstallations(session);
  const installation = installations[0];
  if (!installation) {
    return NextResponse.json({ orgId: null, installationId: null });
  }

  try {
    const res = await fetch(
      `${API()}/api/v1/orgs/by-installation/${installation.id}`,
      { headers: HDRS(), signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) {
      return NextResponse.json({ orgId: null, installationId: installation.id });
    }
    const data = await res.json();
    return NextResponse.json({ orgId: data.id, installationId: installation.id });
  } catch {
    return NextResponse.json({ orgId: null, installationId: installation.id });
  }
}
