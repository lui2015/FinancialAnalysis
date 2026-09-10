import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05060c",
        panel: "#0b1220",
        ink: "#e8f4ff",
        muted: "#7d93ad",
        line: "rgba(0, 240, 255, 0.28)",
        surface: "rgba(8, 16, 32, 0.72)",
        cyan: "#00f0ff",
        magenta: "#ff2bd6",
        acid: "#d6ff3c",
        hot: "#ff3d6e",
        forest: "#00f0ff",
        clay: "#ff3d6e",
        paper: "#05060c",
      },
      maxWidth: {
        page: "1120px",
        report: "960px",
      },
      fontFamily: {
        sans: [
          "var(--font-tech)",
          "ui-sans-serif",
          "PingFang SC",
          "Hiragino Sans GB",
          "Noto Sans SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-orbitron)", "PingFang SC", "sans-serif"],
        tech: ["var(--font-tech)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        cyan: "0 0 18px rgba(0, 240, 255, 0.28), inset 0 0 18px rgba(0, 240, 255, 0.06)",
        magenta: "0 0 18px rgba(255, 43, 214, 0.28), inset 0 0 18px rgba(255, 43, 214, 0.06)",
        hot: "0 0 22px rgba(255, 61, 110, 0.35), inset 0 0 18px rgba(255, 61, 110, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
