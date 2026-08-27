"use client";

import { trpc } from "@/lib/trpc/client";

// The three states are distinct both visually and programmatically (FR-004):
// data-state + role carry the machine-readable distinction, the symbol + text carry a
// non-color cue (frontend rulebook, UI States / Accessibility).
export function BackendStatus() {
  const health = trpc.health.status.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (health.isPending) {
    return (
      <p
        role="status"
        data-testid="backend-status"
        data-state="loading"
        className="rounded-md border border-foreground/20 px-4 py-2 text-sm text-foreground/70"
      >
        <span aria-hidden>…</span> Checking backend status
      </p>
    );
  }

  if (health.isError) {
    return (
      <p
        role="alert"
        data-testid="backend-status"
        data-state="unavailable"
        className="rounded-md border border-red-600/50 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400"
      >
        <span aria-hidden>✕</span> Backend unavailable — the FlowBoard API is not
        responding
      </p>
    );
  }

  return (
    <p
      role="status"
      data-testid="backend-status"
      data-state="healthy"
      className="rounded-md border border-green-600/50 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400"
    >
      <span aria-hidden>✓</span> Backend healthy — {health.data.service} v
      {health.data.version}
    </p>
  );
}
