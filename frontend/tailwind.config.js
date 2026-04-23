/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class", // toggled via `document.documentElement.classList.add("dark")`
  theme: {
    extend: {
      // All colors pull from CSS variables written by ThemeProvider.
      // This means the admin dashboard can change colors LIVE and every
      // Tailwind class (bg-primary, text-accent, etc.) updates instantly.
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          foreground: "rgb(var(--color-accent-foreground) / <alpha-value>)",
        },
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--color-muted) / <alpha-value>)",
          foreground: "rgb(var(--color-muted-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--color-border) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
      },
      boxShadow: {
        soft: "0 2px 8px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)",
        card: "0 4px 16px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04)",
        hover: "0 12px 28px rgb(0 0 0 / 0.12), 0 4px 8px rgb(0 0 0 / 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
