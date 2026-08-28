"use client";

// US3: collapse/expand state shared between Sidebar (which reacts to it) and the ☰
// control (rendered inside TopBar, R-6, a different part of the tree since TopBar is
// page-rendered while Sidebar is layout-rendered). Ephemeral client UI state, not server
// state — React Context is the sanctioned mechanism for exactly this (frontend-rules.md
// State: "Session/theme use React Context"), same pattern as ThemeProvider. Not
// persisted — unlike theme, spec.md's US3 doesn't require the collapse state to survive
// a reload, only a round trip within the same visit.
import { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (context === null) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return context;
}
