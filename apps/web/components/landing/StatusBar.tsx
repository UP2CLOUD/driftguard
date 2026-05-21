"use client";

import { useEffect, useState } from "react";

export function StatusBar() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(d.toISOString().split(".")[0].replace("T", " ") + " UTC");
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--dg-canvas)]/80">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-1.5 font-mono text-[10px] tracking-wider text-[color:var(--dg-fg-subtle)]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-allowed dg-pulse text-allowed" />
            <span className="uppercase">SYSTEM OPERATIONAL</span>
          </span>
          <span className="hidden md:inline opacity-50">●</span>
          <span className="hidden md:inline">EU‑WEST‑1 / EU‑CENTRAL‑1</span>
          <span className="hidden md:inline opacity-50">●</span>
          <span className="hidden md:inline">p99 &lt;2s</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline tabular-nums">{now || "————————"}</span>
          <span className="opacity-50">●</span>
          <span>v0.1.0-beta</span>
        </div>
      </div>
    </div>
  );
}
