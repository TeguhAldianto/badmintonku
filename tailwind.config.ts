import type { Config } from "tailwindcss";

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
        background: "#F8FAFC",
        text: "#0F172A",
      },
    },
  },
  plugins: [],
} satisfies Config;