"use client";

// specs/008-realtime-sync US3 (T026): TopBar's connection-status indicator and
// BoardCanvas are page-level siblings (page.tsx, ADR-30's precedent), the same shape
// sidebar-context.tsx and board-filter-context.tsx already solve for client state shared
// between siblings. This lets TopBar read the one live useBoardRealtime connection that
// BoardCanvas's board actually owns, instead of opening a second hub connection just to
// show a status indicator.
import { createContext, useContext } from "react";
import { useBoardRealtime, type BoardRealtimeStatus } from "@/lib/realtime/use-board-realtime";

const BoardRealtimeContext = createContext<BoardRealtimeStatus | null>(null);

export function BoardRealtimeProvider({
  boardPublicId,
  children,
}: {
  boardPublicId: string;
  children: React.ReactNode;
}) {
  const status = useBoardRealtime(boardPublicId);
  return <BoardRealtimeContext.Provider value={status}>{children}</BoardRealtimeContext.Provider>;
}

export function useBoardRealtimeStatus(): BoardRealtimeStatus {
  const status = useContext(BoardRealtimeContext);
  if (status === null) {
    throw new Error("useBoardRealtimeStatus must be used inside <BoardRealtimeProvider>");
  }
  return status;
}
