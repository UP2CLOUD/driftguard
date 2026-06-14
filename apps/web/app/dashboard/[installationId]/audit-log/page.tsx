import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import Link from "next/link";
import { BACKEND_URL, authHeaders } from "@/lib/backend";
import { AuditLogClient } from "./AuditLogClient";

const PAGE_SIZE = 100;

async function fetchAuditLog(installationId: string, offset: number): Promise<{ entries: AuditEntry[]; hasNext: boolean } | null> {
  try {
    // 1. resolve org_id
    const orgRes = await fetch(
      `${BACKEND_URL}/api/v1/orgs/by-installation/${installationId}`,
      { headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000) }
    );
    if (!orgRes.ok) return null;
    const org = (await orgRes.json()) as { id?: string };
    if (!org?.id) return null;

    // 2. fetch PAGE_SIZE+1 to detect next page without a separate COUNT query
    const res = await fetch(
      `${BACKEND_URL}/api/v1/orgs/${org.id}/audit-log?limit=${PAGE_SIZE + 1}&offset=${offset}`,
      { headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const raw: AuditEntry[] = await res.json();
    return { entries: raw.slice(0, PAGE_SIZE), hasNext: raw.length > PAGE_SIZE };
  } catch {
    return null;
  }
}

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

const ACTION_COLOR: Record<string, string> = {
  // analysis
  "analysis.completed": "text-allowed",
  "policy.blocked": "text-blocked",
  // incidents
  "incident.status_changed": "text-warned",
  // policies
  "policy.created": "text-[color:var(--dg-electric-bright)]",
  "policy.updated": "text-warned",
  "policy.deleted": "text-blocked",
  // repos
  "repo.enabled": "text-allowed",
  "repo.disabled": "text-[color:var(--dg-fg-muted)]",
  // auth / tokens
  "token.created": "text-[color:var(--dg-electric-bright)]",
  "token.revoked": "text-warned",
  // org settings
  "notification_settings.updated": "text-[color:var(--dg-electric-bright)]",
  "aws_settings.updated": "text-[color:var(--dg-electric-bright)]",
  // scans
  "scan.completed": "text-allowed",
};

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ installationId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const { installationId } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const result = await fetchAuditLog(installationId, offset);
  const entries = result?.entries ?? null;
  const hasNext = result?.hasNext ?? false;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="dg-label mb-2">{t("auditLog.eyebrow") ?? "Compliance"}</div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
            {t("auditLog.title") ?? "Audit log"}
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("auditLog.subtitle") ??
              "Append-only record of all actions — signed, tamper-evident. Used for DORA, NIS2 and ISO 27001 evidence."}
          </p>
        </div>

        {entries && entries.length > 0 && (
          <a
            href={`/api/audit-log?installation_id=${installationId}&limit=500&format=csv`}
            className="dg-button dg-button-ghost text-[12px] flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 6l3 3 3-3M1 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("auditLog.exportCSV") ?? "Export CSV"}
          </a>
        )}
      </div>

      {/* Compliance badges */}
      <div className="flex flex-wrap gap-2">
        {["DORA Art. 8", "NIS2 Art. 21", "ISO 27001 A.8.15"].map((b) => (
          <span
            key={b}
            className="font-mono text-[10px] uppercase tracking-widest rounded border border-[color:var(--dg-electric)]/20 bg-[color:var(--dg-electric)]/5 px-2 py-1 text-[color:var(--dg-electric-bright)]"
          >
            {b}
          </span>
        ))}
      </div>

      {entries === null ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-8 text-center">
          <p className="text-[13px] text-warned">
            {t("auditLog.loadError") ?? "Could not load audit log — the API may be unreachable."}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-8 text-center">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            {t("auditLog.empty") ?? "No audit events yet. Events are recorded automatically as you use DriftGuard."}
          </p>
        </div>
      ) : (
        <>
          <AuditLogClient
            entries={entries}
            actionColors={ACTION_COLOR}
            labels={{
              filterPlaceholder: t("auditLog.filterPlaceholder") ?? "Filter by actor, action or target…",
              showing: t("auditLog.showing") ?? "showing",
              of: t("auditLog.of") ?? "of",
              events: t("auditLog.events") ?? "events",
              actor: t("auditLog.actor") ?? "actor",
              action: t("auditLog.action") ?? "action",
              target: t("auditLog.target") ?? "target",
              time: t("auditLog.time") ?? "time",
              payload: t("auditLog.payload") ?? "payload",
              noMatch: t("auditLog.noMatch") ?? "No events match this filter.",
            }}
          />
          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between pt-2">
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.previous") ?? "← Previous"}
                </Link>
              ) : <span />}
              <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
                {(t("analyses.page") ?? "Page {n}").replace("{n}", String(page))}
              </span>
              {hasNext ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
                >
                  {t("analyses.next") ?? "Next →"}
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
