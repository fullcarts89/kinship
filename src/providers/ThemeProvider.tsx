import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import tokens from "@design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  /** Current theme mode */
  mode: ThemeMode;
  /** Toggle between light and dark mode */
  toggleTheme: () => void;
  /** Set a specific theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Access to design tokens */
  tokens: typeof tokens;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = "light" }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      toggleTheme,
      setTheme,
      tokens,
    }),
    [mode, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
