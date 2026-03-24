/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#18181b',  // zinc-900
          raised: '#27272a',   // zinc-800
          overlay: '#3f3f46',  // zinc-700
        },
      },
    },
  },
  plugins: [],
}
