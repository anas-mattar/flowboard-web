"use client";

// specs/008-realtime-sync US3 (T025), FR-009: a small always-visible signal so a member
// never sees a board that looks current while its live channel is actually down.
// plan.md: reuses existing shadcn/ui primitive styling only, no new UI library. Consumes
// the one hub connection BoardRealtimeProvider already owns for this board
// (board-realtime-context.tsx) rather than opening its own.
import { useBoardRealtimeStatus } from "@/components/board/board-realtime-context";

const PRESENTATION = {
  live: { label: "Live", dotClassName: "bg-emerald-500" },
  reconnecting: { label: "Reconnecting…", dotClassName: "bg-amber-500 animate-pulse" },
  offline: { label: "Offline", dotClassName: "bg-foreground/30" },
} as const;

export function RealtimeStatusIndicator() {
  const status = useBoardRealtimeStatus();
  const presentationKey = status === "connected" ? "live" : status === "reconnecting" ? "reconnecting" : "offline";
  const { label, dotClassName } = PRESENTATION[presentationKey];

  return (
    <span className="flex items-center gap-1.5 text-xs text-foreground/70" title={`Live updates: ${label}`}>
      <span className={`size-1.5 rounded-full ${dotClassName}`} aria-hidden="true" />
      {label}
    </span>
  );
}
