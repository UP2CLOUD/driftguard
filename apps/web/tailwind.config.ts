import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["Geist", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#fafaf7",
        accent: "#ff5c1a",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};

export default config;
