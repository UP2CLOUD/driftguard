import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DriftGuard — AI runtime safety & Terraform PR review";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07080a",
          backgroundImage:
            "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(63,140,255,0.08), transparent 60%), linear-gradient(rgba(154,160,166,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(154,160,166,.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
          padding: 72,
          color: "#e8eaed",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Top: logo + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="4" y="4" width="26" height="26" rx="5" stroke="#62a0ff" strokeWidth="2" opacity="0.7" />
              <rect x="12" y="12" width="10" height="10" rx="2" fill="#3F8CFF" />
            </svg>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#e8eaed", letterSpacing: "0.14em", fontFamily: "monospace" }}>
              DRIFTGUARD
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#9aa0a6" }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#22d38d" }} />
            <span style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: "monospace" }}>driftguard.io</span>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, color: "#525c6b", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
            Terraform PR review / semantic memory
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#e8eaed" }}>
            Your AI agents write Terraform.
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#3F8CFF", marginTop: 8 }}>
            We make sure they ship safer.
          </div>
        </div>

        {/* Bottom: stats strip */}
        <div style={{ display: "flex", marginTop: 56, gap: 48, fontSize: 14 }}>
          <Stat label="Scope" value="Terraform · OpenTofu" />
          <Stat label="Reviews" value="Cost · Security · Drift" />
          <Stat label="Compliance" value="DORA / NIS2 / ISO 27001" />
        </div>
      </div>
    ),
    { ...size }
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ color: "#525c6b", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#e8eaed", fontSize: 22, fontWeight: 600, marginTop: 6 }}>{value}</span>
    </div>
  );
}
