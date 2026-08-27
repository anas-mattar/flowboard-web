"use client";

// Theme ownership (ADR-3, specs/001-solution-scaffold/plan.md — governance repo):
// the inline bootstrap script in app/layout.tsx derives the initial theme
// (localStorage, falling back to matchMedia) and sets the `dark` class before first
// paint; this context treats that class as the single runtime source of truth — one
// implementation of the default logic, never two — and owns toggling + persistence.
// localStorage is the sanctioned slot for the theme preference (security rulebook §9).
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

// Must match the key in the layout.tsx bootstrap script.
const STORAGE_KEY = "flowboard-theme";

let listeners: Array<() => void> = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// Server render assumes light; useSyncExternalStore reconciles to the real client
// snapshot after hydration without a hydration mismatch.
function getServerSnapshot(): Theme {
  return "light";
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode, blocked): the toggle still works for
      // this page view; the choice just won't persist.
    }
    for (const listener of listeners) {
      listener();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
