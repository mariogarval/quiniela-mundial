import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0D0F14",
        surface: "#13161D",
        surface2: "#1C2130",
        border: "rgba(255,255,255,0.07)",
        borderHi: "rgba(255,255,255,0.13)",
        brand: {
          green: "#00E676",
          greenDim: "rgba(0,230,118,0.12)",
          greenGlow: "rgba(0,230,118,0.25)",
          cyan: "#00BCD4",
        },
        amber: "#FFB74D",
        amberDim: "rgba(255,183,77,0.12)",
        danger: "#FF5252",
        gold: "#FFD700",
        silver: "#C0C0C0",
        bronze: "#CD7F32",
        textMuted: "rgba(255,255,255,0.5)",
        textSub: "rgba(255,255,255,0.28)",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      animation: {
        pulseDot: "pulseDot 1.5s infinite",
        float: "float 3s ease-in-out infinite",
        confetti: "confetti 6s linear infinite",
        slideUp: "slideUp 0.35s ease both",
      },
      keyframes: {
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        confetti: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(900px) rotate(720deg)", opacity: "0" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
