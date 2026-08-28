"use client";

// VI-004's ☰ control, made functional (US3, T036) — TopBar stays a server component
// (R-6), so only this one interactive piece is a client island consuming the shared
// collapse state (sidebar-context.tsx).
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-context";

export function SidebarToggleButton() {
  const { collapsed, toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="rounded p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Menu className="size-4" />
    </button>
  );
}
