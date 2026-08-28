"use client";

// VI-005: the reference shows a compact icon-only control in this position, not a
// text-labeled button.
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className="rounded-md border border-foreground/20 p-1.5 hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
