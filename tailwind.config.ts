import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        secondary: "#e9c349",
        primary: "#ecb2ff",
        "primary-container": "#8e44ad",
        "on-primary": "#520071",
        "on-surface": "#ebdfe9",
        "on-surface-variant": "#d1c2d2",
        "on-background": "#ebdfe9",
        background: "#171218",
        surface: "#171218",
        "surface-dim": "#171218",
        "surface-container": "#231e25",
        "surface-container-high": "#2e282f",
        "surface-container-highest": "#39333a",
        "surface-container-lowest": "#110c13",
        "inverse-primary": "#873da6",
        error: "#ffb4ab",
        outline: "#9a8c9b",
      },
      spacing: {
        sm: "16px",
        xs: "8px",
        "margin-desktop": "80px",
        "margin-mobile": "20px",
        md: "24px",
        lg: "40px",
        xl: "64px",
      },
      fontFamily: {
        "display-md": ["var(--font-playfair)", "Georgia", "serif"],
        "display-lg": ["var(--font-playfair)", "Georgia", "serif"],
        "headline-lg": ["var(--font-playfair)", "Georgia", "serif"],
        "headline-sm": ["var(--font-playfair)", "Georgia", "serif"],
        "label-caps": ["var(--font-cormorant)", "Georgia", "serif"],
        "title-lg": ["var(--font-inter)", "system-ui", "sans-serif"],
        "body-md": ["var(--font-inter)", "system-ui", "sans-serif"],
        "body-lg": ["var(--font-inter)", "system-ui", "sans-serif"],
        "button-text": ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-md": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-sm": ["24px", { lineHeight: "1.4", fontWeight: "600" }],
        "title-lg": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "button-text": ["15px", { lineHeight: "1", fontWeight: "600" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "600" }],
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
