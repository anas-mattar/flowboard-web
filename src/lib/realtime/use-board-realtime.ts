"use client";

// contracts/realtime-api.md, research.md R-3/R-6/R-7: connects directly to the SignalR hub
// with a short-lived, board-scoped token minted through the tRPC BFF path
// (`boards.getRealtimeToken`) — the one sanctioned exception to the tRPC-only Data Flow
// rule (frontend-rules.md). Every "BoardEvent" is treated as an invalidate-and-refetch
// signal against boards.getContent; no event payload is applied to the cache directly
// (ADR-36) — this hook never inspects the event's payload, only that one arrived.
// specs/008-realtime-sync US3 (T024): withAutomaticReconnect() plus onreconnecting/
// onreconnected/onclose handlers track connection state for the FR-009 status indicator.
// onreconnected also re-issues JoinBoard — SignalR's automatic reconnect negotiates a
// brand-new connection id, so group membership from before the drop is gone until this
// runs again (contracts/realtime-api.md) — and invalidates getContent so the client
// catches up to current server state (FR-008, research.md R-7).
import { useEffect, useRef, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { trpc } from "@/lib/trpc/client";

export type BoardRealtimeStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export function useBoardRealtime(boardPublicId: string): BoardRealtimeStatus {
  const utils = trpc.useUtils();
  const utilsRef = useRef(utils);
  useEffect(() => {
    utilsRef.current = utils;
  }, [utils]);

  // FR-012: no hub URL configured is just another "live channel unavailable" case — the
  // board stays fully usable via the existing 003-007 REST/tRPC paths. Computed as the
  // initial state (not a synchronous setState in the effect below) since it never changes
  // for the life of this component.
  const [status, setStatus] = useState<BoardRealtimeStatus>(() =>
    process.env.NEXT_PUBLIC_FLOWBOARD_HUB_URL ? "connecting" : "disconnected",
  );

  useEffect(() => {
    const hubUrl = process.env.NEXT_PUBLIC_FLOWBOARD_HUB_URL;
    if (!hubUrl) {
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
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("BoardEvent", () => {
      void utilsRef.current.boards.getContent.invalidate({ boardPublicId });
    });

    connection.onreconnecting(() => setStatus("reconnecting"));

    connection.onreconnected(() => {
      setStatus("connected");
      connection
        .invoke("JoinBoard", boardPublicId)
        .catch(() => {
          // JoinBoard can be rejected (Context.Abort()) if access was revoked while this
          // client was offline — treat that like a received access.revoked event: the
          // board is no longer live for this client, so fall back to the disconnected
          // (no live updates) presentation rather than claiming "connected".
          setStatus("disconnected");
        });
      void utilsRef.current.boards.getContent.invalidate({ boardPublicId });
    });

    connection.onclose(() => setStatus("disconnected"));

    connection
      .start()
      .then(() => {
        if (!stopped) {
          setStatus("connected");
          return connection.invoke("JoinBoard", boardPublicId);
        }
      })
      .catch(() => {
        // FR-012: a failed connect must never block the board from being usable — no
        // visible error, just no live updates. Story 4/US4 hardens this further.
        setStatus("disconnected");
      });

    return () => {
      stopped = true;
      connection
        .invoke("LeaveBoard", boardPublicId)
        .catch(() => {})
        .finally(() => void connection.stop());
    };
  }, [boardPublicId]);

  return status;
}
