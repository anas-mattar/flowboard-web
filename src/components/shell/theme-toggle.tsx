"use client";

import { useTheme } from "@/lib/theme/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:bg-foreground/5"
    >
      {theme === "dark" ? "Light" : "Dark"} theme
    </button>
  );
}
