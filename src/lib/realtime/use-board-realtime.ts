"use client";

// contracts/realtime-api.md, research.md R-3/R-6: connects directly to the SignalR hub
// with a short-lived, board-scoped token minted through the tRPC BFF path
// (`boards.getRealtimeToken`) — the one sanctioned exception to the tRPC-only Data Flow
// rule (frontend-rules.md). Every "BoardEvent" is treated as an invalidate-and-refetch
// signal against boards.getContent; no event payload is applied to the cache directly
// (ADR-36) — this hook never inspects the event's payload, only that one arrived.
import { useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { trpc } from "@/lib/trpc/client";

export function useBoardRealtime(boardPublicId: string) {
  const utils = trpc.useUtils();
  const utilsRef = useRef(utils);
  useEffect(() => {
    utilsRef.current = utils;
  }, [utils]);

  useEffect(() => {
    const hubUrl = process.env.NEXT_PUBLIC_FLOWBOARD_HUB_URL;
    if (!hubUrl) {
      // FR-012: no hub URL configured is just another "live channel unavailable" case —
      // the board stays fully usable via the existing 003-007 REST/tRPC paths.
      return;
    }

    let stopped = false;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          const { token } = await utilsRef.current.client.boards.getRealtimeToken.query({ boardPublicId });
          return token;
        },
        // Auth is the query-string token above, not a cookie — this connection is
        // cross-origin (Program.cs's "Realtime" CORS policy), which is simpler without
        // needing AllowCredentials on the backend.
        withCredentials: false,
      })
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("BoardEvent", () => {
      void utilsRef.current.boards.getContent.invalidate({ boardPublicId });
    });

    connection
      .start()
      .then(() => {
        if (!stopped) {
          return connection.invoke("JoinBoard", boardPublicId);
        }
      })
      .catch(() => {
        // FR-012: a failed connect must never block the board from being usable — no
        // visible error, just no live updates. Story 4/US4 hardens this further.
      });

    return () => {
      stopped = true;
      connection
        .invoke("LeaveBoard", boardPublicId)
        .catch(() => {})
        .finally(() => void connection.stop());
    };
  }, [boardPublicId]);
}
