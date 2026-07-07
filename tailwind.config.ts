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
        secondary: "var(--theme-secondary)",
        primary: "var(--theme-primary)",
        "primary-container": "var(--theme-primary-container)",
        "on-primary": "var(--theme-on-primary)",
        "on-surface": "var(--theme-on-surface)",
        "on-surface-variant": "var(--theme-on-surface-variant)",
        "on-background": "var(--theme-on-background)",
        background: "var(--theme-bg)",
        surface: "var(--theme-surface)",
        "surface-dim": "var(--theme-surface-dim)",
        "surface-container": "var(--theme-surface-container)",
        "surface-container-high": "var(--theme-surface-container-high)",
        "surface-container-highest": "var(--theme-surface-container-highest)",
        "surface-container-lowest": "var(--theme-surface-container-lowest)",
        "inverse-primary": "var(--theme-inverse-primary)",
        error: "var(--theme-error)",
        outline: "var(--theme-outline)",
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
      boxShadow: {
        nav: "var(--kelmon-nav-shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
