/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-system-ui", "SFMono-Regular", "Menlo", "Consolas", "system-ui"],
      },
    },
  },
  plugins: [],
};
