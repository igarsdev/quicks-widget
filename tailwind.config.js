/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        quicks: {
          ink: "#0f172a",
          slate: "#334155",
          muted: "#64748b",
          line: "#e2e8f0",
          soft: "#f8fafc",
          accent: "#2563eb",
          accentSoft: "#dbeafe",
        },
      },
      boxShadow: {
        widget: "0 20px 60px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
