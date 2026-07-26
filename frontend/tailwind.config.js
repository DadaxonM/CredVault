/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0F14',
          900: '#0F1621',
          800: '#151E2C',
          700: '#1D2838',
          600: '#293650',
        },
        brass: {
          400: '#E8B85C',
          500: '#D9A441',
          600: '#B9832C',
        },
        mint: {
          400: '#4FD1A5',
          500: '#2FB88B',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        vault: '0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
