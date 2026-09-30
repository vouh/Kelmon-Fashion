"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The storefront and the admin dashboard keep separate light/dark choices, so
 * switching one never changes the other. Keep in sync with the inline script
 * in app/layout.tsx, which applies the right one before first paint.
 */
const SITE_KEY = "kelmon-theme";
const ADMIN_KEY = "kelmon-admin-theme";

function isAdminPath(pathname: string | null): boolean {
  return pathname === "/admin" || Boolean(pathname?.startsWith("/admin/"));
}

function readTheme(admin: boolean): Theme {
  try {
    // An admin who hasn't chosen yet keeps whatever the shared setting was.
    const stored = (admin ? localStorage.getItem(ADMIN_KEY) : null) ?? localStorage.getItem(SITE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const admin = isAdminPath(usePathname());
  const [theme, setThemeState] = useState<Theme>("light");

  // Re-read on moving between the shop and the admin, which swaps the setting.
  useEffect(() => {
    const current = readTheme(admin);
    setThemeState(current);
    applyTheme(current);
  }, [admin]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(admin ? ADMIN_KEY : SITE_KEY, next);
    } catch {}
    applyTheme(next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
