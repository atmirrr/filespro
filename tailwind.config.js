/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#FFFFFF",
          panel: "#F6F6F6",
          sidebar: "#E8E8EA",
          hover: "#EFEFF1",
          elevated: "#FFFFFF",
        },
        border: {
          subtle: "#E1E1E3",
          default: "#D1D1D3",
        },
        text: {
          primary: "#1D1D1F",
          secondary: "#4A4A4D",
          muted: "#8A8A8E",
        },
        accent: {
          DEFAULT: "#0A84FF",
          hover: "#006EE6",
          soft: "#E5F0FF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: ["SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
