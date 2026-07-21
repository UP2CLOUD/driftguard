"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const CONTROLS = [
  "SOC2-CC6.1", "SOC2-CC6.8", "DORA-Art.9", "NIS2-Art.21",
  "ISO-27001-A.9", "HIPAA-164.312", "PCI-DSS-1.2", "GDPR-Art.32"
];

const SECTORS = ["FinServ", "Health", "Gov", "Retail", "Tech", "Energy"];

function generateHeatmapData() {
  return SECTORS.map(() => 
    CONTROLS.map(() => Math.random() > 0.7 ? "blocked" : Math.random() > 0.4 ? "warned" : "allowed")
  );
}

export function ComplianceHeatmap() {
  const [data, setData] = useState<string[][]>([]);

  useEffect(() => {
    setData(generateHeatmapData());
    const interval = setInterval(() => {
      setData(generateHeatmapData());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Continuous Compliance
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Automated Framework Mapping</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl mx-auto">
          Every runtime action is instantly mapped to major compliance frameworks. Generate auditor-ready evidence automatically as DriftGuard enforces policies across your autonomous fleet.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-[color:var(--dg-border-strong)] rounded-lg bg-[color:var(--dg-surface)] p-6">
          <div className="flex mb-4">
            <div className="w-24"></div>
            {CONTROLS.map(c => (
              <div key={c} className="flex-1 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] uppercase text-center -rotate-45 transform origin-bottom-left ml-4">
                {c}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            {SECTORS.map((sector, i) => (
              <div key={sector} className="flex items-center gap-4">
                <div className="w-24 font-mono text-[11px] text-[color:var(--dg-fg-muted)] uppercase text-right">
                  {sector}
                </div>
                <div className="flex-1 flex gap-2">
                  {data[i]?.map((status, j) => (
                    <motion.div
                      key={j}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: j * 0.05 }}
                      className={`h-8 flex-1 rounded ${
                        status === 'blocked' ? 'bg-[color:var(--dg-blocked)]/20 border border-[color:var(--dg-blocked)]' :
                        status === 'warned' ? 'bg-[color:var(--dg-warned)]/20 border border-[color:var(--dg-warned)]' :
                        'bg-[color:var(--dg-allowed)]/10 border border-[color:var(--dg-allowed)]/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 font-mono text-[10px] text-[color:var(--dg-fg-subtle)] uppercase">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[color:var(--dg-allowed)]/10 border border-[color:var(--dg-allowed)]/30"></span> Compliant</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[color:var(--dg-warned)]/20 border border-[color:var(--dg-warned)]"></span> Warned</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[color:var(--dg-blocked)]/20 border border-[color:var(--dg-blocked)]"></span> Blocked & Logged</div>
          </div>
        </div>
      </div>
    </div>
  );
}
