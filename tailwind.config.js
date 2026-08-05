/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        surface: {
          background: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        status: {
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
          info: "#2563EB",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        soft: "0 2px 6px 0 rgba(0, 0, 0, 0.06)",
        card: "0 2px 8px 0 rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
