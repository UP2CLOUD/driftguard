import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

function csvEscape(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(fields: unknown[]): string {
  return fields.map(csvEscape).join(",");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const res = await fetch(`${BACKEND_URL}/api/v1/analyses/${id}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json({ error: "analysis not found" }, { status: res?.status ?? 502 });
  }

  const data = (await res.json()) as {
    repo_full_name?: string;
    pr_number?: number;
    head_sha?: string;
    findings?: Array<{
      severity: string;
      type: string;
      rule_id: string;
      category: string;
      title: string;
      message: string;
      suggestion: string;
      resource: string;
      file: string;
      line: number | null;
      controls: string[];
    }>;
  };

  const findings = data.findings ?? [];
  const date = new Date().toISOString().slice(0, 10);
  const shortId = id.slice(0, 8);

  const header = row([
    "severity",
    "rule_id",
    "category",
    "title",
    "message",
    "suggestion",
    "resource",
    "file",
    "line",
    "controls",
  ]);

  const lines = findings.map((f) =>
    row([
      f.severity,
      f.rule_id,
      f.category,
      f.title,
      f.message,
      f.suggestion,
      f.resource,
      f.file,
      f.line ?? "",
      (f.controls ?? []).join("|"),
    ]),
  );

  const csv = [header, ...lines].join("\n");
  const filename = `driftguard-findings-${shortId}-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
