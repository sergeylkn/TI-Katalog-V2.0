/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4561f8', dark: '#2f42ee', glow: 'rgba(69,97,248,0.3)' },
      },
    },
  },
  plugins: [],
}
