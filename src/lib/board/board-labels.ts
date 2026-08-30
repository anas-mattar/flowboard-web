// Extracted from board-canvas.tsx (004) so specs/007-search-filter's FilterPopover can
// derive the same label roster without re-implementing the walk. Known limitation (no
// board-level label-listing endpoint exists yet, see specs/004-card-crud/review-notes.md):
// this only offers labels already assigned to at least one card on this board — not a
// full board label roster.
import type { BoardContent, LabelSummary } from "@/lib/api/boards-client";

export function deriveBoardLabels(board: BoardContent): LabelSummary[] {
  const seen = new Map<string, LabelSummary>();
  for (const list of board.lists) {
    for (const card of list.cards) {
      for (const label of card.labels) {
        seen.set(label.publicId, label);
      }
    }
  }
  return Array.from(seen.values());
}
