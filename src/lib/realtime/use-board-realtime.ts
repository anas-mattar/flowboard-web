"use client";

// contracts/realtime-api.md, research.md R-3/R-6/R-7: connects directly to the SignalR hub
// with a short-lived, board-scoped token minted through the tRPC BFF path
// (`boards.getRealtimeToken`) — the one sanctioned exception to the tRPC-only Data Flow
// rule (frontend-rules.md). Every "BoardEvent" is treated as an invalidate-and-refetch
// signal against boards.getContent; no event payload is applied to the cache directly
// (ADR-36) — this hook never inspects the event's payload, only that one arrived.
// specs/008-realtime-sync US3 (T024): withAutomaticReconnect() plus onreconnecting/
// onreconnected/onclose handlers track connection state for the FR-009 status indicator.
// Both the initial connect and onreconnected funnel through joinAndSync (below), which
// re-issues JoinBoard — SignalR's automatic reconnect negotiates a brand-new connection id,
// so group membership from before the drop is gone until this runs again
// (contracts/realtime-api.md) — then invalidates getContent so the client catches up to
// current server state (FR-008, research.md R-7), only reporting "connected" once both have
// settled. Each call is stamped with an `attempt` number so a stale in-flight attempt
// (started before a drop) can't resolve late and overwrite a newer "reconnecting" or
// "connected" state with its own outdated result.
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
    // Guards against a stale joinAndSync attempt (started before a drop) resolving after a
    // newer one has already started — without this, a slow initial-connect catch-up could
    // finish after onreconnecting/onreconnected has already moved the status on, and
    // overwrite "reconnecting" (or a fresher "connected") with its own now-outdated result.
    let attempt = 0;
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

    // Re-joins the board group and refreshes the cache before reporting "connected", for
    // both the initial connect and every reconnect. JoinBoard must complete first — group
    // membership is what makes future events reach this client at all — and the cache
    // fetch must run only after that (not fired concurrently with it), so the fetched
    // snapshot is guaranteed to reflect anything already persisted by the time this client
    // starts receiving events again. Firing the fetch immediately, before JoinBoard
    // settles, leaves a gap: a mutation that lands in that window is neither in the
    // (already-in-flight) snapshot nor delivered as an event, and nothing repairs it until
    // an unrelated later event happens to trigger another refetch (FR-008, SC-004).
    const joinAndSync = async () => {
      const thisAttempt = ++attempt;
      try {
        await connection.invoke("JoinBoard", boardPublicId);
        await utilsRef.current.boards.getContent.invalidate({ boardPublicId });
        if (!stopped && thisAttempt === attempt) {
          setStatus("connected");
        }
      } catch {
        // JoinBoard can be rejected (Context.Abort()) if access was revoked while this
        // client was offline — fall back to the disconnected (no live updates)
        // presentation, and still invalidate so the existing no-access UI (T018) picks up
        // the revocation instead of leaving stale board content displayed indefinitely.
        if (!stopped && thisAttempt === attempt) {
          setStatus("disconnected");
        }
        utilsRef.current.boards.getContent.invalidate({ boardPublicId }).catch(() => {});
      }
    };

    connection.onreconnecting(() => {
      attempt++;
      setStatus("reconnecting");
    });
    connection.onreconnected(() => void joinAndSync());
    connection.onclose(() => {
      attempt++;
      setStatus("disconnected");
    });

    connection
      .start()
      .then(() => (stopped ? undefined : joinAndSync()))
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
