/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: '#2563eb', // Matches web
        'brand-light': '#eff6ff',
      }
    },
  },
  plugins: [],
}

