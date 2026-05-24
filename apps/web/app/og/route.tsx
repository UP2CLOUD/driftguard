/**
 * Dynamic OG image — /og?t=<title>&l=<locale>
 * 1200×630 PNG. Edge runtime (zero cold start).
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { type Locale, locales } from "@/i18n/config";

export const runtime = "edge";

const BRAND = "#3F8CFF";
const BG    = "#07080a";
const FG    = "#e8ecf0";
const MUTED = "#64748b";

const SUB: Record<Locale, string> = {
  en:      "AI runtime safety for Terraform agents",
  "pt-BR": "Segurança de runtime para agentes Terraform",
  es:      "Seguridad en tiempo de ejecución para agentes Terraform",
  zh:      "Terraform AI 代理运行时安全",
  hi:      "Terraform एजेंट के लिए AI रनटाइम सुरक्षा",
  ar:      "أمان وقت التشغيل لـ Terraform",
};

const PILLS: Record<Locale, [string, string, string]> = {
  en:      ["Cost delta", "Drift detection", "Policy engine"],
  "pt-BR": ["Delta de custo", "Detecção drift", "Motor de políticas"],
  es:      ["Delta de coste", "Detección drift", "Motor de políticas"],
  zh:      ["成本变化", "漂移检测", "策略引擎"],
  hi:      ["लागत डेल्टा", "ड्रिफ्ट", "नीति इंजन"],
  ar:      ["دلتا التكلفة", "الانجراف", "محرك السياسة"],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTitle  = searchParams.get("t") ?? "DriftGuard";
  const rawLocale = searchParams.get("l") ?? "en";
  const locale    = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : "en";
  const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + "…" : rawTitle;
  const sub   = SUB[locale];
  const pills = PILLS[locale];

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, background: BG,
        display: "flex", flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        padding: "64px 72px", position: "relative",
      }}>
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(${BRAND}08 1px,transparent 1px),linear-gradient(90deg,${BRAND}08 1px,transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        {/* Spotlight */}
        <div style={{
          position: "absolute", top: -120, left: "50%",
          width: 800, height: 500, marginLeft: -400,
          background: `radial-gradient(ellipse,${BRAND}18 0%,transparent 70%)`,
        }} />
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
            <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke={BRAND} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7 L10 17" stroke={BRAND} strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 700, color: FG, letterSpacing: -0.5 }}>DriftGuard</span>
        </div>
        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 48, flex: 1 }}>
          <p style={{
            fontSize: title.length > 50 ? 44 : 52, fontWeight: 700, color: FG,
            lineHeight: 1.15, margin: 0, letterSpacing: -1.5, maxWidth: 900,
          }}>{title}</p>
          <p style={{ fontSize: 22, color: MUTED, margin: 0, lineHeight: 1.4, maxWidth: 700 }}>{sub}</p>
        </div>
        {/* Bottom */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 40, paddingTop: 24, borderTop: `1px solid ${BRAND}20`,
        }}>
          <div style={{ display: "flex", gap: 10 }}>
            {pills.map(p => (
              <div key={p} style={{
                padding: "6px 14px", border: `1px solid ${BRAND}30`, borderRadius: 6,
                fontSize: 13, color: BRAND, background: `${BRAND}08`,
              }}>{p}</div>
            ))}
          </div>
          <span style={{ fontSize: 14, color: MUTED }}>driftguard.io</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
