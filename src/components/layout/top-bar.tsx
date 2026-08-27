import { ThemeToggle } from "@/components/shell/theme-toggle";

export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-3">
      <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
      <ThemeToggle />
    </header>
  );
}
