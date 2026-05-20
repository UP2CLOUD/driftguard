import Link from "next/link";
import { LocaleSwitcher } from "../LocaleSwitcher";
import { getUserPreferences } from "@/lib/preferences/server";

export async function Footer() {
  const preferences = await getUserPreferences();
  return (
    <footer className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]">
      {/* Top: ASCII signature */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
                <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
              </svg>
              <span className="font-sans text-base font-semibold tracking-tight text-[color:var(--dg-fg)]">driftguard</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
              AI runtime safety + semantic memory. Built for autonomous infrastructure agents.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-allowed">
                <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse" />
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>

          <FootCol title="Product" links={[
            { l: "Architecture", h: "#architecture" },
            { l: "Memory", h: "#memory" },
            { l: "Integrate", h: "#integrate" },
            { l: "Pricing", h: "#pricing" },
            { l: "Changelog", h: "/changelog" },
          ]} />
          <FootCol title="Developers" links={[
            { l: "Docs", h: "/docs" },
            { l: "API reference", h: "/docs/api" },
            { l: "SDK / GitHub", h: "https://github.com/UP2CLOUD/driftguard" },
            { l: "Status", h: "/status" },
          ]} />
          <FootCol title="Company" links={[
            { l: "Customers", h: "/customers" },
            { l: "Security", h: "/security" },
            { l: "Compliance", h: "/compliance" },
            { l: "Careers", h: "/careers" },
          ]} />
          <FootCol title="Legal" links={[
            { l: "Privacy", h: "/privacy" },
            { l: "Terms", h: "/terms" },
            { l: "DPA", h: "/dpa" },
            { l: "Subprocessors", h: "/subprocessors" },
          ]} />
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-[color:var(--dg-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-4 sm:px-6 py-5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span>© 2026 UP2CLOUD</span>
            <span className="opacity-50">●</span>
            <span>Lisboa / EU</span>
            <span className="opacity-50">●</span>
            <span>GDPR‑native</span>
          </div>
          <div className="flex items-center gap-4">
            <LocaleSwitcher initialPreferences={preferences} compact />
            <span className="opacity-50">●</span>
            <span>v0.1.0‑beta</span>
            <span className="opacity-50">●</span>
            <span>commit a8ebf90</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: { l: string; h: string }[] }) {
  return (
    <div>
      <div className="dg-label">{title}</div>
      <ul className="mt-4 space-y-2.5 text-[13px]">
        {links.map((l) => (
          <li key={l.l}>
            <Link href={l.h} className="text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition">
              {l.l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
