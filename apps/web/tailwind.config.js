/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface": "#0f131d", "surface-dim": "#0f131d", "background": "#0f131d",
        "surface-container-lowest": "#0a0e18", "surface-container-low": "#171b26",
        "surface-container": "#1c1f2a", "surface-container-high": "#262a35",
        "surface-container-highest": "#313540", "surface-bright": "#353944",
        "surface-variant": "#313540", "on-surface": "#dfe2f1",
        "on-surface-variant": "#c7c4d7", "outline": "#908fa0",
        "outline-variant": "#464554", "primary": "#c0c1ff",
        "primary-container": "#8083ff", "on-primary-container": "#0d0096",
        "primary-fixed": "#e1e0ff", "secondary": "#4edea3",
        "secondary-container": "#00a572", "on-secondary": "#003824",
        "tertiary": "#d0bcff", "tertiary-container": "#a078ff",
        "error": "#ffb4ab", "error-container": "#93000a",
        brand: { 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca" },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Outfit", "system-ui", "sans-serif"],
        display: ["Outfit", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 28px -12px rgba(2,6,18,.5)",
        lift: "0 16px 40px -16px rgba(99,102,241,.45)",
      },
      transitionTimingFunction: {
        'ease-out-strong': 'cubic-bezier(0.23,1,0.32,1)',
      },
    },
  },
  plugins: [],
};
