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

  const costDelta = a.cost_delta_cents || 0;
  const riskScore = a.risk_score || 0;
  const findingsCount = a.findings.length;

  return (
    <main className="min-h-screen bg-paper pb-16">
      <DashboardNav installationId={installationId} />
      
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Back Link */}
        <Link
          href={`/dashboard/${installationId}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-accent transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Dynamic Page Header */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink/5 pb-6">
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Analysis <span className="text-muted font-mono font-normal">#{analysisId.slice(0, 8)}</span>
            </h1>
            <span className={`inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border ${
              a.status === "completed"
                ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/15"
                : "bg-blue-500/5 text-blue-600 border-blue-500/15"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${a.status === "completed" ? "bg-emerald-500" : "bg-blue-500 animate-pulse"}`}></span>
              {a.status}
            </span>
          </div>

          {/* GitHub PR Link Context Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-ink/5 text-ink/80 px-3 py-1.5 rounded-lg border border-ink/5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
              </svg>
              GitHub PR #42
            </span>
          </div>
        </div>

        {/* Dynamic Metric Stat Grid */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat
            label="Cost impact"
            value={formatCents(costDelta)}
            subtext="monthly billing change"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
            theme={costDelta > 0 ? "amber" : costDelta < 0 ? "emerald" : "default"}
          />
          <Stat
            label="Risk rating"
            value={`${riskScore}/100`}
            subtext={riskScore > 70 ? "Requires Review" : "Low Risk Profile"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
            theme={riskScore > 70 ? "red" : riskScore > 30 ? "amber" : "emerald"}
          />
          <Stat
            label="Active findings"
            value={String(findingsCount)}
            subtext={`${findingsCount} compliance evidence`}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            }
            theme={findingsCount > 0 ? "amber" : "emerald"}
          />
        </div>

        {/* AI Summary Section */}
        {a.summary_md && (
          <section className="mt-12 bg-white/50 border border-ink/10 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.904-4.477M18 10.5c0 2.9-2.184 5.293-5 5.477V21M12 3v3m0 0a3 3 0 1 0 0 6M12 6a3 3 0 0 0 0 6m0 0h.008v.008H12V12Zm3.96-3.04a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-6 0h.008v.008H9.96V8.96ZM12 21h.008v.008H12V21Zm0-3h.008v.008H12V18Z" />
              </svg>
              AI Insights & Summary
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-ink/5 bg-ink/5 p-5 text-sm leading-relaxed text-ink/80 whitespace-pre-wrap font-sans">
              {a.summary_md}
            </div>
          </section>
        )}

        {/* Findings Table Section */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2 border-b border-ink/5 pb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Review Evidence & Findings
          </h2>
          <div className="mt-4">
            <FindingsTable findings={a.findings} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  subtext,
  icon,
  theme = "default",
}: {
  label: string;
  value: string;
  subtext: string;
  icon?: React.ReactNode;
  theme?: "default" | "emerald" | "amber" | "red";
}) {
  const themeClasses = {
    default: "border-ink/10 bg-white/40 text-ink",
    emerald: "border-emerald-500/10 bg-emerald-500/5 text-emerald-600",
    amber: "border-amber-500/10 bg-amber-500/5 text-amber-600",
    red: "border-red-500/10 bg-red-500/5 text-red-600",
  };

  const iconClasses = {
    default: "bg-ink/5 text-ink/75",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600 animate-pulse",
  };

  return (
    <div className={`rounded-2xl border p-5 backdrop-blur-sm flex items-start justify-between shadow-sm hover:shadow-md transition-all duration-300 ${themeClasses[theme]}`}>
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-muted">{label}</div>
        <div className="mt-3 font-display text-3xl font-extrabold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted font-sans">{subtext}</div>
      </div>
      {icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border border-current/10 ${iconClasses[theme]}`}>
          {icon}
        </div>
      )}
    </div>
  );
}
