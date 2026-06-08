import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { beGet } from "@/lib/backend";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { IncidentStatusForm } from "@/components/IncidentStatusForm";

async function fetchIncident(id: string) {
  return beGet<any>(`/api/v1/incidents/${id}`, { revalidate: 0, timeout: 4000 });
}

const SEV: Record<string, string> = {
  critical: "text-blocked border-blocked/30 bg-blocked/5",
  high: "text-[color:var(--dg-severity-high)] border-[color:var(--dg-severity-high)]/30 bg-[color:var(--dg-severity-high)]/5",
  medium: "text-warned border-warned/30 bg-warned/5",
  low: "text-[color:var(--dg-fg-muted)] border-[color:var(--dg-border)]",
};

const STATUS_BADGE: Record<string, string> = {
  open: "text-blocked border-blocked/30 bg-blocked/5",
  investigating: "text-warned border-warned/30 bg-warned/5",
  resolved: "text-allowed border-allowed/30 bg-allowed/5",
  suppressed: "text-[color:var(--dg-fg-subtle)] border-[color:var(--dg-border)]",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ installationId: string; incidentId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId, incidentId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const incident = await fetchIncident(incidentId);

  if (!incident) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-20 text-center">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          Not found
        </div>
        <p className="font-sans text-[13px] font-medium text-[color:var(--dg-fg-muted)] mb-5">
          Incident not found or no longer available.
        </p>
        <Link
          href={`/dashboard/${installationId}/incidents`}
          className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
        >
          ← {t("incidents.title") ?? "Incidents"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/dashboard/${installationId}/incidents`}
          className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
        >
          ← {t("incidents.title") ?? "Incidents"}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div className="flex-1 min-w-0">
          <div className="dg-label mb-2">{t("incidents.eyebrow") ?? "Incident"}</div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest shrink-0 ${SEV[incident.severity] ?? ""}`}>
              {incident.severity}
            </span>
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest shrink-0 ${STATUS_BADGE[incident.status] ?? ""}`}>
              {incident.status}
            </span>
            {incident.recurrence_count > 1 && (
              <span className="font-mono text-[10px] text-warned">
                ↺ {incident.recurrence_count}× {t("incidents.recurrenceLabel")?.replace("{n}", "") ?? "recurrence"}
              </span>
            )}
          </div>
          <h1 className="font-sans text-2xl font-semibold text-[color:var(--dg-fg)]">
            {incident.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-4">
          {/* Description */}
          {incident.description && (
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-2">
                Description
              </div>
              <p className="text-[13px] text-[color:var(--dg-fg-muted)] leading-relaxed">
                {incident.description}
              </p>
            </div>
          )}

          {/* Root cause */}
          {incident.root_cause && (
            <div className="rounded-md border border-warned/20 bg-warned/5 p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-warned mb-2">
                Root cause
              </div>
              <p className="text-[13px] text-warned leading-relaxed">
                {incident.root_cause}
              </p>
            </div>
          )}

          {/* Suggested fix */}
          {incident.suggested_fix && (
            <div className="rounded-md border border-allowed/20 bg-allowed/5 p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-allowed mb-2">
                {t("incidents.suggestedFix") ?? "Suggested fix"}
              </div>
              <p className="text-[13px] text-allowed leading-relaxed">
                {incident.suggested_fix}
              </p>
            </div>
          )}

          {/* Status update form */}
          <IncidentStatusForm
            incidentId={incidentId}
            currentStatus={incident.status}
            currentRootCause={incident.root_cause ?? ""}
            currentSuggestedFix={incident.suggested_fix ?? ""}
          />
        </div>

        {/* Sidebar: timeline stats */}
        <div className="space-y-4">
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="border-b border-[color:var(--dg-border)] px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                Timeline
              </span>
            </div>
            <div className="divide-y divide-[color:var(--dg-border)]">
              {[
                { label: "First seen",  val: incident.first_seen_at  ? formatDateTime(incident.first_seen_at,  preferences.locale) : "—" },
                { label: "Last seen",   val: incident.last_seen_at   ? formatDateTime(incident.last_seen_at,   preferences.locale) : "—" },
                { label: "Resolved",    val: incident.resolved_at    ? formatDateTime(incident.resolved_at,    preferences.locale) : "—" },
                { label: "Recurrences", val: String(incident.recurrence_count ?? 0) },
              ].map(({ label, val }) => (
                <div key={label} className="px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-0.5">{label}</div>
                  <div className="font-mono text-[12px] text-[color:var(--dg-fg)]">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fingerprint */}
          {incident.fingerprint && (
            <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">Fingerprint</div>
              <code className="font-mono text-[10px] text-[color:var(--dg-fg-muted)] break-all">{incident.fingerprint}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
