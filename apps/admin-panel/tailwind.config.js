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
          black: '#0a0a0a',
          dark: '#141414',
          gray: '#1a1a1a',
          accent: '#00ff9d',
          amber: '#ffb830',
          cyan: '#00d4ff',
          red: '#ff3366',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'display': ['Space Grotesk', 'sans-serif'],
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
