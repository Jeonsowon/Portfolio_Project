/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'Work Sans', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          DEFAULT: "#2E2E2E", // Graphite Dark Gray
          light: "#525252",   // Gray 600
          dark: "#171717",    // Near Black
        },
        accent: {
          DEFAULT: "#737373", // Medium Gray
          light: "#A3A3A3",   // Gray 400
          dark: "#525252",    // Gray 600
        },
        background: {
          DEFAULT: "#F9FAFB", // Cool White
        },
      },
    },
  },
  plugins: [],
}