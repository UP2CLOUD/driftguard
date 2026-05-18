import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.25rem",
        lg: "0.375rem",
      },
      colors: {
        canvas: "var(--dg-canvas)",
        surface: {
          DEFAULT: "var(--dg-surface)",
          raised: "var(--dg-surface-raised)",
          overlay: "var(--dg-surface-overlay)",
        },
        border: {
          DEFAULT: "var(--dg-border)",
          strong: "var(--dg-border-strong)",
        },
        fg: {
          DEFAULT: "var(--dg-fg)",
          muted: "var(--dg-fg-muted)",
          subtle: "var(--dg-fg-subtle)",
        },
        accent: {
          DEFAULT: "var(--dg-accent)",
          muted: "var(--dg-accent-muted)",
        },
        severity: {
          critical: "var(--dg-severity-critical)",
          high: "var(--dg-severity-high)",
          medium: "var(--dg-severity-medium)",
          low: "var(--dg-severity-low)",
        },
        signal: {
          compliant: "var(--dg-signal-compliant)",
          drift: "var(--dg-signal-drift)",
          cost: "var(--dg-signal-cost)",
          security: "var(--dg-signal-security)",
          "infra-deletion": "var(--dg-signal-infra-deletion)",
        },
        status: {
          success: "var(--dg-status-success)",
          warning: "var(--dg-status-warning)",
          danger: "var(--dg-status-danger)",
          info: "var(--dg-status-info)",
        },
        /* Legacy aliases — migrate components off these */
        ink: "var(--dg-fg)",
        paper: "var(--dg-canvas)",
        muted: "var(--dg-fg-muted)",
      },
      boxShadow: {
        panel: "0 1px 0 0 var(--dg-border) inset",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(0.5rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s ease-out forwards",
        "fade-in": "fade-in 0.45s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
