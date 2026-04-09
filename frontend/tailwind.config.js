/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080810",
        card: "#10101e",
        elevated: "#1a1a2e",
        border: "rgba(255,255,255,0.07)",
        teal: {
          DEFAULT: "#00d4aa",
          dim: "#00a884",
          glow: "rgba(0,212,170,0.15)",
        },
        red: {
          stock: "#ff4d6d",
          dim: "#cc3d57",
          glow: "rgba(255,77,109,0.15)",
        },
        amber: {
          stock: "#f59e0b",
          dim: "#d97706",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#64748b",
          muted: "#334155",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
}
