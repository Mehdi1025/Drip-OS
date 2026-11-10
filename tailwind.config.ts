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
        sans: ["var(--font-onest)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        drip: {
          /** Brand : papier — fond principal */
          paper: "#F7F5F2",
          /** Brand : encre — texte & contours */
          ink: "#14121F",
          volt: "#5B2EFF",
          "volt-bright": "#7B57FF",
          peach: "#FF7A45",
          lilac: "#E4DEFF",
          "gray-text": "#5E5A70",
          "gray-light": "#B4B0C6",
          chip: "#D8C27A",
          surface: "#FFFFFF",
          elevated: "#FFFFFF",
          muted: "#5E5A70",
          border: "rgba(20, 18, 31, 0.1)",
          "border-strong": "rgba(20, 18, 31, 0.18)",
          success: "#22c55e",
          "success-dark": "#14532d",
          danger: "#ef4444",
        },
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(91, 46, 255, 0.35)",
        "glow-sm": "0 0 20px -6px rgba(91, 46, 255, 0.28)",
        "glow-peach": "0 0 24px -8px rgba(255, 122, 69, 0.3)",
        panel: "0 2px 16px rgba(20, 18, 31, 0.06), 0 0 0 1px rgba(20, 18, 31, 0.06)",
        float: "0 12px 40px rgba(20, 18, 31, 0.12)",
        brutal: "6px 6px 0 0 #14121F",
        "brutal-sm": "4px 4px 0 0 #14121F",
        "brutal-lg": "8px 8px 0 0 #14121F",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91, 46, 255, 0.12), transparent 55%), radial-gradient(ellipse 40% 30% at 100% 0%, rgba(255, 122, 69, 0.08), transparent 50%)",
        "gradient-volt":
          "linear-gradient(135deg, #6E45FF 0%, #5B2EFF 55%, #4A22E8 100%)",
        "stripe-motif":
          "repeating-linear-gradient(-12deg, transparent, transparent 8px, rgba(91, 46, 255, 0.03) 8px, rgba(91, 46, 255, 0.03) 9px)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
