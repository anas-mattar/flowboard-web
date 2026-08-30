// specs/007-search-filter/research.md R-5: mirrors the reference prototype's own
// `passesFilter` exactly (docs/product/prototype/flowboard-prototype.html) — search text
// matches case-insensitive substring against title+description; label/member filters are
// OR-within-category; at most one due-date bucket is active; every active category
// combines with AND. Verified against the prototype live, not inferred from prose.
import type { CardSummary } from "@/lib/api/boards-client";

export type DueBucket = "overdue" | "week" | "none" | "";

export interface BoardFilterState {
  text: string;
  labelIds: string[];
  memberIds: string[];
  due: DueBucket;
}

export const EMPTY_BOARD_FILTER: BoardFilterState = {
  text: "",
  labelIds: [],
  memberIds: [],
  due: "",
};

export function isBoardFilterActive(filter: BoardFilterState): boolean {
  return (
    filter.text.length > 0 ||
    filter.labelIds.length > 0 ||
    filter.memberIds.length > 0 ||
    filter.due !== ""
  );
}

// ADR-31: "overdue"/"none" reuse the server-computed dueStatus/dueAt as-is (no
// re-derivation); "week" has no server-computed equivalent, so it's a one-off client-side
// window check over the raw dueAt, matching the prototype's own `due === 'week'` branch
// exactly: -1 day ≤ (dueAt − now) ≤ +7 days.
function passesDueBucket(card: CardSummary, due: DueBucket): boolean {
  if (due === "") return true;
  if (due === "overdue") return card.dueStatus === "overdue";
  if (due === "none") return card.dueAt === null;

  if (card.dueAt === null) return false;
  const diffDays = (new Date(card.dueAt).getTime() - Date.now()) / 86_400_000;
  return diffDays >= -1 && diffDays <= 7;
}

export function passesBoardFilter(card: CardSummary, filter: BoardFilterState): boolean {
  if (filter.text) {
    const haystack = `${card.title} ${card.description ?? ""}`.toLowerCase();
    if (!haystack.includes(filter.text.toLowerCase())) return false;
  }

  if (filter.labelIds.length > 0) {
    const cardLabelIds = card.labels.map((l) => l.publicId);
    if (!filter.labelIds.some((id) => cardLabelIds.includes(id))) return false;
  }

  if (filter.memberIds.length > 0) {
    const cardMemberIds = card.members.map((m) => m.publicId);
    if (!filter.memberIds.some((id) => cardMemberIds.includes(id))) return false;
  }

  return passesDueBucket(card, filter.due);
}
