import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useGetActiveThemeQuery } from "../store/themeApi.js";

/**
 * ThemeProvider is the heart of the live-theming feature.
 *
 * 1. On mount it fetches the admin's active theme from /api/theme/active.
 * 2. It converts the theme's hex colors into "R G B" triplets and writes
 *    them as CSS custom properties on :root. Tailwind reads those vars via
 *    rgb(var(--color-primary) / <alpha-value>), so every single class in
 *    the app (bg-primary, text-accent, etc.) re-skins automatically.
 * 3. When the admin publishes a new theme, RTK Query invalidates the cache
 *    and this effect re-runs → entire site re-skins without a page reload.
 * 4. Dark mode is a toggle persisted to localStorage; it flips an extra
 *    .dark class on <html> which overrides the CSS vars.
 */

// Convert "#f97316" or "rgb(249 115 22)" to "249 115 22"
const hexToRgbTriplet = (input) => {
  if (!input) return null;
  const hex = String(input).trim();
  if (hex.startsWith("rgb")) {
    const m = hex.match(/\d+/g);
    return m ? m.slice(0, 3).join(" ") : null;
  }
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return `${r} ${g} ${b}`;
};

const COLOR_MAP = {
  primary: "--color-primary",
  primaryForeground: "--color-primary-foreground",
  accent: "--color-accent",
  accentForeground: "--color-accent-foreground",
  background: "--color-background",
  foreground: "--color-foreground",
  muted: "--color-muted",
  mutedForeground: "--color-muted-foreground",
  border: "--color-border",
  success: "--color-success",
  warning: "--color-warning",
  danger: "--color-danger",
};

// Inline styles on :root have higher specificity than `.dark { ... }` class
// rules, so we cannot pre-set both palettes and rely on the class to swap them.
// Instead, write whichever palette matches the current mode directly to :root,
// and clear values not present in the active palette so the stylesheet
// fallbacks (in index.css) kick in for missing keys.
const applyColors = (colors) => {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
    const value = colors ? hexToRgbTriplet(colors[key]) : null;
    if (value) {
      root.style.setProperty(cssVar, value);
    } else {
      root.style.removeProperty(cssVar);
    }
  }
};

const ThemeContext = createContext({
  theme: null,
  isDark: false,
  toggleDark: () => {},
  animationsEnabled: true,
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  const { data, isLoading } = useGetActiveThemeQuery();
  const theme = data?.theme;

  // Dark mode (persisted)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("ss:dark");
    if (stored === "1") return true;
    if (stored === "0") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // Apply theme tokens whenever the theme or dark-mode state changes
  useEffect(() => {
    const root = document.documentElement;

    if (theme) {
      applyColors(isDark ? theme.darkColors : theme.colors);

      if (theme.radius) root.style.setProperty("--radius", theme.radius);
      if (theme.fonts?.heading) root.style.setProperty("--font-heading", theme.fonts.heading);
      if (theme.fonts?.body) root.style.setProperty("--font-body", theme.fonts.body);

      if (theme.siteName) document.title = theme.siteName;
      if (theme.faviconUrl) {
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = theme.faviconUrl;
      }
    } else {
      // No theme data — clear any previously-set inline colors so the
      // :root / .dark fallbacks in index.css apply.
      applyColors(null);
    }
  }, [theme, isDark]);

  // Toggle dark mode class + persist
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ss:dark", isDark ? "1" : "0");
  }, [isDark]);

  // Disable framer-motion globally when admin turns off animations
  useEffect(() => {
    if (theme?.features?.enableAnimations === false) {
      document.documentElement.style.setProperty("--motion-reduce", "1");
    } else {
      document.documentElement.style.removeProperty("--motion-reduce");
    }
  }, [theme?.features?.enableAnimations]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleDark: () => setIsDark((v) => !v),
      animationsEnabled: theme?.features?.enableAnimations !== false,
      isLoading,
    }),
    [theme, isDark, isLoading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
