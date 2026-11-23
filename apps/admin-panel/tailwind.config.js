/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'mission': {
          black: '#0f0f13',
          dark: '#17171d',
          gray: '#1f1f27',
          line: '#2a2a34',
          muted: '#8b8b9a',
          ink: '#15151b',
          accent: '#a8b8ff',
          ok: '#7ee2b8',
          amber: '#f5c98a',
          cyan: '#9fd8ff',
          red: '#ff9bb3',
          blue: '#b9c8ff',
          pink: '#ffc4d6',
          purple: '#d4c2ff',
          mint: '#bfeedd',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
