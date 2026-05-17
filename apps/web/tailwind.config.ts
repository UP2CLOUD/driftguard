import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "Geist", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#f4f4f5",      // Bright zinc-100 for high-density dark mode
        paper: "#09090b",    // Operational zinc-950 obsidian canvas
        accent: "#f97316",   // Restrained amber-orange for controlled highlights
        muted: "#a1a1aa",    // Zinc-400 for structural secondary tags
      },
    },
  },
  plugins: [],
};

export default config;
