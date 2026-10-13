import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        drip: {
          paper: "#f2ede4",
          ink: "#0a0a0a",
          volt: "#ccff00",
          surface: "#ffffff",
          muted: "#0a0a0a99",
          success: "#22c55e",
          "success-dark": "#14532d",
          danger: "#dc2626",
        },
      },
      boxShadow: {
        brutal: "6px 6px 0 0 #0a0a0a",
        "brutal-sm": "4px 4px 0 0 #0a0a0a",
        "brutal-lg": "8px 8px 0 0 #0a0a0a",
        "brutal-volt": "6px 6px 0 0 #ccff00",
      },
    },
  },
  plugins: [],
};

export default config;
