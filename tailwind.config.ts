import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2421",
        paper: "#f7f6f2",
        line: "#e2ded5",
        blue: "#315fdc",
        teal: "#0f766e",
        mint: "#e1f4ed",
        sun: "#f0a22e",
        clay: "#b85d3a",
        violet: "#6f61d7",
        rose: "#d92d52"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(23, 32, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
