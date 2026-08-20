import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16A34A",
          dark: "#15803D",
        },
        accent: "#A3E635",
        dark: "#0B1220",
        background: {
          DEFAULT: "#F5F7F5",
          surface: "#FFFFFF",
        },
        text: {
          DEFAULT: "#101828",
          muted: "#667085",
        },
        border: "#E4E7EC",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
