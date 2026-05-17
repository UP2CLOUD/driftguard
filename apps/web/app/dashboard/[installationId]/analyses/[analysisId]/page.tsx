import Link from "next/link";

import { DashboardNav } from "@/components/DashboardNav";
import { FindingsTable } from "@/components/FindingsTable";
import { formatCents, getAnalysis } from "@/lib/api";

export default async function AnalysisDetail({
  params,
}: {
  params: Promise<{ installationId: string; analysisId: string }>;
}) {
  const { installationId, analysisId } = await params;
  const a = await getAnalysis(analysisId);

  return (
    <main className="min-h-screen">
      <DashboardNav installationId={installationId} />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href={`/dashboard/${installationId}`}
          className="text-sm text-muted hover:text-accent"
        >
          ← back
        </Link>

        <div className="mt-6 flex flex-wrap items-baseline gap-6">
          <h1 className="font-display text-3xl font-bold">Analysis {a.id.slice(0, 8)}</h1>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-xs uppercase tracking-widest">
            {a.status}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Cost impact" value={formatCents(a.cost_delta_cents)} />
          <Stat label="Risk score" value={String(a.risk_score ?? "—")} />
          <Stat label="Findings" value={String(a.findings.length)} />
        </div>

        {a.summary_md && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">AI summary</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-ink/10 bg-white/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {a.summary_md}
            </pre>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">All findings</h2>
          <div className="mt-3">
            <FindingsTable findings={a.findings} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white/40 p-4">
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
