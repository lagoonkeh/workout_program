/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gym: {
          950: '#020617', // ultra dark background
          900: '#0f172a', // panel background
          800: '#1e293b', // card background
          700: '#334155', // card border
          600: '#475569', // subtle text/dividers
          accent: '#10b981', // emerald rest/success
          warning: '#f59e0b', // amber warning/phase
          danger: '#ef4444', // red heavy compound/error
          electric: '#38bdf8', // sky blue concentric/timer
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
