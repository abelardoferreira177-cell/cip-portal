/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0B1B33",
          800: "#102847",
          700: "#16345A",
        },
        accent: {
          600: "#1E5AA8",
          500: "#2A6AC0",
        }
      }
    },
  },
  plugins: [],
};
