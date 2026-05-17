"use client";

import { useState } from "react";
import { Finding } from "@/lib/api";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (findings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 p-8 text-center bg-white/10 backdrop-blur-sm">
        <p className="text-sm text-muted">No findings detected. Your infrastructure configuration looks clean!</p>
      </div>
    );
  }

  const getSeverityBadgeClass = (severity: string) => {
    const classes: Record<string, string> = {
      critical: "bg-red-500/10 text-red-600 border-red-500/20",
      high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      info: "bg-ink/5 text-ink/70 border-ink/10",
    };
    return classes[severity.toLowerCase()] || classes.info;
  };

  const getFindingIcon = (type: string) => {
    if (type.toLowerCase() === "security") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white/60 backdrop-blur-md shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 border-b border-ink/5 text-left text-xs uppercase tracking-widest font-mono text-muted">
            <tr>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Severity</th>
              <th className="px-5 py-4">Resource Address</th>
              <th className="px-5 py-4">Message</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {findings.map((f, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <>
                  <tr key={i} className="hover:bg-white/40 transition-colors">
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 font-mono text-xs text-ink/80">
                        {getFindingIcon(f.type)}
                        {f.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono border ${getSeverityBadgeClass(f.severity)}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-ink/75">{f.resource}</td>
                    <td className="px-5 py-4 text-ink">{f.message}</td>
                    <td className="px-5 py-4 text-right">
                      {f.suggestion ? (
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : i)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-ink transition bg-accent/5 hover:bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/10"
                        >
                          {isExpanded ? "Hide Fix" : "Show Fix"}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-muted font-mono">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Suggestion Expansion Box */}
                  {f.suggestion && isExpanded && (
                    <tr className="bg-ink/[0.02]">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="rounded-xl border border-ink/5 bg-ink/5 p-4 animate-slideDown">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono uppercase tracking-widest text-muted flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              Recommended Fix Suggestion
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(f.suggestion || "");
                              }}
                              className="text-xs font-semibold text-muted hover:text-ink transition flex items-center gap-1 px-2 py-1 rounded border border-ink/10 hover:border-ink/20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-3a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0 10.5-3 3m0 0-3-3m3 3V15" />
                              </svg>
                              Copy fix code
                            </button>
                          </div>
                          <pre className="font-mono text-xs text-ink/80 bg-ink/10 rounded-lg p-3 overflow-x-auto border border-ink/5 leading-relaxed">
                            {f.suggestion}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
