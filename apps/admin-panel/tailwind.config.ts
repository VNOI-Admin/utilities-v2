import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        accent: {
          light: "#1e40af",
          dark: "#7dd3fc",
        },
        blue: {
          450: "#4cc2ff",
          550: "#0078d4",
        },
        red: {
          650: "#C42B1C",
          1000: "#442726",
        },
        green: {
          150: "#DFF6DD",
          450: "#6CCB5F",
        },
        lime: {
          1000: "#393D1B",
        },
        yellow: {
          75: "#FFF4CE",
          1000: "#433519",
        },
        neutral: {
          1000: "#111111",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
