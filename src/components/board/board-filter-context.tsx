"use client";

// specs/007-search-filter ADR-30/research.md R-4: TopBar (search box, Filter trigger) and
// BoardCanvas (chip bar, actual card filtering) are page-level siblings under
// app/(app)/boards/[boardPublicId]/page.tsx, not parent/child — the same shape
// sidebar-context.tsx already solves for collapse state shared between TopBar's ☰ control
// and the layout-rendered Sidebar. frontend-rules.md's State rule sanctions React Context
// for exactly this class of ephemeral, non-server UI state; this holds only transient
// filter selections, never card/label/member data itself (that stays in
// trpc.boards.getContent's React Query cache).
import { createContext, useContext, useMemo, useState } from "react";
import { EMPTY_BOARD_FILTER, type BoardFilterState, type DueBucket } from "@/lib/board/passes-board-filter";

interface BoardFilterContextValue {
  filter: BoardFilterState;
  setText: (text: string) => void;
  toggleLabel: (labelPublicId: string) => void;
  toggleMember: (memberPublicId: string) => void;
  setDue: (due: DueBucket) => void;
  clearOne: (key: "text" | `label:${string}` | `member:${string}` | "due") => void;
  clearAll: () => void;
}

const BoardFilterContext = createContext<BoardFilterContextValue | null>(null);

export function BoardFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<BoardFilterState>(EMPTY_BOARD_FILTER);

  const value = useMemo<BoardFilterContextValue>(
    () => ({
      filter,
      setText: (text) => setFilter((f) => ({ ...f, text })),
      toggleLabel: (labelPublicId) =>
        setFilter((f) => ({
          ...f,
          labelIds: f.labelIds.includes(labelPublicId)
            ? f.labelIds.filter((id) => id !== labelPublicId)
            : [...f.labelIds, labelPublicId],
        })),
      toggleMember: (memberPublicId) =>
        setFilter((f) => ({
          ...f,
          memberIds: f.memberIds.includes(memberPublicId)
            ? f.memberIds.filter((id) => id !== memberPublicId)
            : [...f.memberIds, memberPublicId],
        })),
      setDue: (due) => setFilter((f) => ({ ...f, due: f.due === due ? "" : due })),
      clearOne: (key) =>
        setFilter((f) => {
          if (key === "text") return { ...f, text: "" };
          if (key === "due") return { ...f, due: "" };
          if (key.startsWith("label:")) {
            return { ...f, labelIds: f.labelIds.filter((id) => id !== key.slice(6)) };
          }
          return { ...f, memberIds: f.memberIds.filter((id) => id !== key.slice(7)) };
        }),
      clearAll: () => setFilter(EMPTY_BOARD_FILTER),
    }),
    [filter],
  );

  return <BoardFilterContext.Provider value={value}>{children}</BoardFilterContext.Provider>;
}

export function useBoardFilter(): BoardFilterContextValue {
  const context = useContext(BoardFilterContext);
  if (context === null) {
    throw new Error("useBoardFilter must be used inside <BoardFilterProvider>");
  }
  return context;
}
