import Link from "next/link";
import { DashboardNav } from "@/components/DashboardNav";
import { FindingsTable } from "@/components/FindingsTable";
import { getAnalysis } from "@/lib/api";
import { formatCostDeltaCentsForUser } from "@/lib/currency/format";
import { getUserPreferences } from "@/lib/preferences/server";

export default async function AnalysisDetail({
  params,
}: {
  params: Promise<{ installationId: string; analysisId: string }>;
}) {
  const { installationId, analysisId } = await params;
  const preferences = await getUserPreferences();
  const a = await getAnalysis(analysisId);

  const costDelta = a.cost_delta_cents || 0;
  const costFormatted = await formatCostDeltaCentsForUser(
    a.cost_delta_cents,
    preferences.currency,
    preferences.locale
  );
  const riskScore = a.risk_score || 0;
  const findingsCount = a.findings.length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <DashboardNav installationId={installationId} initialPreferences={preferences} />
      
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Back Link */}
        <Link
          href={`/dashboard/${installationId}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-400 transition font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Dynamic Page Header */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Analysis <span className="text-zinc-500 font-mono font-normal">#{analysisId.slice(0, 8)}</span>
            </h1>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
              a.status === "completed"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}>
              <span className={`w-1 h-1 rounded-full ${a.status === "completed" ? "bg-emerald-500" : "bg-blue-500 animate-pulse"}`}></span>
              {a.status}
            </span>
          </div>

          {/* GitHub PR Link Context Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded border border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
              </svg>
              GitHub PR #88
            </span>
          </div>
        </div>

        {/* Dynamic Metric Stat Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Stat
            label="Cost impact"
            value={costFormatted}
            subtext="monthly billing change"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            }
            theme={findingsCount > 0 ? "amber" : "emerald"}
          />
        </div>

        {/* AI Summary Section */}
        {a.summary_md && (
          <section className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.904-4.477M18 10.5c0 2.9-2.184 5.293-5 5.477V21M12 3v3m0 0a3 3 0 1 0 0 6M12 6a3 3 0 0 0 0 6m0 0h.008v.008H12V12Zm3.96-3.04a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-6 0h.008v.008H9.96V8.96ZM12 21h.008v.008H12V21Zm0-3h.008v.008H12V18Z" />
              </svg>
              AI Insights & Operational Recommendations
            </h2>
            <div className="mt-3 rounded border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-300 font-sans">
              {renderMarkdown(a.summary_md)}
            </div>
          </section>
        )}

        {/* Findings Table Section */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Review Evidence & Compliance Findings
          </h2>
          <div className="mt-3">
            <FindingsTable findings={a.findings} />
          </div>
        </section>
      </div>
    </main>
  );
}

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const content = line.trim();
        if (!content) return null;

        // Parse headers
        if (content.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-zinc-200 mt-4 mb-1.5 first:mt-0 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <span className="w-1 h-3 rounded bg-orange-500 shrink-0"></span>
              {parseInline(content.slice(4))}
            </h3>
          );
        }

        // Parse list items
        if (content.startsWith("- ")) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-orange-500 mt-2 shrink-0 animate-pulse"></span>
              <span className="text-zinc-300 leading-relaxed text-sm">{parseInline(content.slice(2))}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-zinc-300 leading-relaxed text-sm">
            {parseInline(content)}
          </p>
        );
      })}
    </div>
  );
}

function parseInline(text: string) {
  const parts = text.split("**");
  return parts.map((part, index) => {
    // Odd indexes are inside **...**
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-semibold text-zinc-100 font-sans tracking-wide">
          {part}
        </strong>
      );
    }
    return part;
  });
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
    default: "border-zinc-800 bg-zinc-900/50 text-zinc-100",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    red: "border-red-500/20 bg-red-500/5 text-red-400",
  };

  const iconClasses = {
    default: "bg-zinc-800 text-zinc-400 border-zinc-700",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse",
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-150 ${themeClasses[theme]}`}>
      {/* Top Row: Label and Icon */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{label}</div>
        {icon && (
          <div className={`w-7 h-7 rounded flex items-center justify-center border shrink-0 ${iconClasses[theme]}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Bottom Stack: Value and Subtext */}
      <div className="mt-3">
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-zinc-400 font-sans">{subtext}</div>
      </div>
    </div>
  );
}
