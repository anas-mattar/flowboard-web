// Shared with card-front.tsx (board canvas) and card-detail/card-due-date-panel.tsx (modal) —
// one source of truth for the due-status color rule (frontend-rules.md: never re-derive
// the bucket itself, but the display mapping for a given bucket is presentation-only and
// belongs in exactly one place).
export type DueStatus = "complete" | "overdue" | "soon" | "future";

export const DUE_STATUS_STYLES: Record<DueStatus, string> = {
  complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  soon: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  future: "bg-muted text-muted-foreground",
};

export function formatDueLabel(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
