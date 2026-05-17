"use client";

import { useState } from "react";
import { Finding } from "@/lib/api";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/20">
        <p className="text-sm text-zinc-400">No findings detected. Your infrastructure configuration looks clean!</p>
      </div>
    );
  }

  const getSeverityBadgeClass = (severity: string) => {
    const classes: Record<string, string> = {
      critical: "bg-red-500/10 text-red-400 border border-red-500/20",
      high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
      medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      low: "bg-zinc-500/10 text-zinc-400 border border-zinc-800",
      info: "bg-zinc-800 text-zinc-400 border border-zinc-700",
    };
    return classes[severity.toLowerCase()] || classes.info;
  };

  const getFindingIcon = (type: string) => {
    if (type.toLowerCase() === "security") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-amber-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase tracking-wider font-mono text-zinc-400">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Resource Address</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {findings.map((f, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <>
                  <tr key={i} className="hover:bg-zinc-900/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-mono text-xs text-zinc-300">
                        {getFindingIcon(f.type)}
                        {f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide font-mono border ${getSeverityBadgeClass(f.severity)}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{f.resource}</td>
                    <td className="px-4 py-3 text-zinc-200">{f.message}</td>
                    <td className="px-4 py-3 text-right">
                      {f.suggestion ? (
                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : i)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-400 transition bg-orange-500/5 hover:bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/10"
                        >
                          {isExpanded ? "Hide Fix" : "Show Fix"}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className={`w-2.5 h-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500 font-mono">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Suggestion Expansion Box */}
                  {f.suggestion && isExpanded && (
                    <tr className="bg-zinc-950/40">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              Recommended Fix Suggestion
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(f.suggestion || "");
                              }}
                              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-3a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0 10.5-3 3m0 0-3-3m3 3V15" />
                              </svg>
                              Copy fix code
                            </button>
                          </div>
                          <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 rounded p-3 overflow-x-auto border border-zinc-800 leading-relaxed">
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
