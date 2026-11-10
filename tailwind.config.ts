import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        drip: {
          paper: "#060608",
          ink: "#f2f2f3",
          volt: "#d8ff52",
          "volt-dim": "#a8c43a",
          surface: "rgba(255, 255, 255, 0.045)",
          elevated: "#121214",
          muted: "#8b8b93",
          border: "rgba(255, 255, 255, 0.09)",
          "border-strong": "rgba(255, 255, 255, 0.16)",
          success: "#4ade80",
          "success-dark": "#166534",
          danger: "#f87171",
        },
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(216, 255, 82, 0.35)",
        "glow-sm": "0 0 24px -8px rgba(216, 255, 82, 0.25)",
        panel:
          "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -24px rgba(0,0,0,0.65)",
        float:
          "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
        brutal: "6px 6px 0 0 #0a0a0a",
        "brutal-sm": "4px 4px 0 0 #0a0a0a",
        "brutal-lg": "8px 8px 0 0 #0a0a0a",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 90% 60% at 50% -30%, rgba(216,255,82,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(120,120,255,0.08), transparent 50%)",
        "gradient-volt":
          "linear-gradient(135deg, #e8ff6a 0%, #c8f542 45%, #9fd636 100%)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
