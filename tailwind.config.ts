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
          /** Brand book : encre — fonds foncés */
          paper: "#14121F",
          /** Brand book : papier — texte sur fond foncé */
          ink: "#F7F5F2",
          /** Brand book : volt — signature (#5B2EFF) */
          volt: "#5B2EFF",
          "volt-bright": "#7B57FF",
          /** Brand book : pêche — accents */
          peach: "#FF7A45",
          /** Secondaires */
          lilac: "#E4DEFF",
          "gray-text": "#5E5A70",
          "gray-light": "#B4B0C6",
          chip: "#D8C27A",
          surface: "rgba(228, 222, 255, 0.06)",
          elevated: "#1E1B2E",
          muted: "#B4B0C6",
          border: "rgba(228, 222, 255, 0.12)",
          "border-strong": "rgba(228, 222, 255, 0.2)",
          /** Vert atelier : succès / stock OK (hors charte, conservé sur demande) */
          success: "#4ade80",
          "success-dark": "#166534",
          danger: "#f87171",
        },
      },
      boxShadow: {
        glow: "0 0 60px -12px rgba(91, 46, 255, 0.45)",
        "glow-sm": "0 0 28px -8px rgba(91, 46, 255, 0.35)",
        "glow-peach": "0 0 32px -10px rgba(255, 122, 69, 0.35)",
        panel:
          "0 1px 0 0 rgba(228, 222, 255, 0.08) inset, 0 24px 48px -24px rgba(0, 0, 0, 0.55)",
        float:
          "0 8px 32px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(228, 222, 255, 0.06) inset",
        brutal: "6px 6px 0 0 #14121F",
        "brutal-sm": "4px 4px 0 0 #14121F",
        "brutal-lg": "8px 8px 0 0 #14121F",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(ellipse 90% 55% at 50% -25%, rgba(91, 46, 255, 0.22), transparent 58%), radial-gradient(ellipse 45% 35% at 100% 10%, rgba(255, 122, 69, 0.12), transparent 50%), radial-gradient(ellipse 40% 30% at 0% 80%, rgba(74, 222, 128, 0.06), transparent 45%)",
        "gradient-volt":
          "linear-gradient(135deg, #6E45FF 0%, #5B2EFF 50%, #4A22E8 100%)",
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
