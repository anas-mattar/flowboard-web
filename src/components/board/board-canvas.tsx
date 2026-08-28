"use client";

// VI-006: lists arranged left-to-right, each list a fixed-width column with its own
// background distinct from the canvas. Lists/cards render in the stored order the
// backend already returned (invariant 2) — this component MUST NOT re-sort them.
// plan.md ADR-19: this is now the client-driven owner of the board's live data
// (trpc.boards.getContent.useQuery, seeded with the server component's initialData so
// the first paint is unchanged) — every card mutation invalidates this same query.
// plan.md ADR-14: the open card is plain client-side dialog state, not a route.
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { BoardContent, LabelSummary } from "@/lib/api/boards-client";
import { ListColumn } from "@/components/board/list-column";
import { CardDetailModal } from "@/components/board/card-detail/card-detail-modal";

interface BoardCanvasProps {
  boardPublicId: string;
  initialBoard: BoardContent;
}

export function BoardCanvas({ boardPublicId, initialBoard }: BoardCanvasProps) {
  const [openCardPublicId, setOpenCardPublicId] = useState<string | null>(null);
  const { data: board } = trpc.boards.getContent.useQuery(
    { boardPublicId },
    { initialData: initialBoard },
  );
  const activeBoard = board ?? initialBoard;

  // Known limitation (no board-level label listing endpoint exists yet, see
  // specs/004-card-crud/review-notes.md): the labels panel can only offer labels
  // already assigned to at least one card on this board, derived from data already
  // fetched here — not a full board label roster.
  const boardLabels = useMemo(() => {
    const seen = new Map<string, LabelSummary>();
    for (const list of activeBoard.lists) {
      for (const card of list.cards) {
        for (const label of card.labels) {
          seen.set(label.publicId, label);
        }
      }
    }
    return Array.from(seen.values());
  }, [activeBoard]);

  return (
    <>
      <main className="flex-1 overflow-x-auto overflow-y-auto bg-muted/20 p-4">
        {activeBoard.lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">This board has no lists yet.</p>
        ) : (
          <div className="flex h-full items-start gap-4">
            {activeBoard.lists.map((list) => (
              <ListColumn
                key={list.publicId}
                list={list}
                boardPublicId={boardPublicId}
                onOpenCard={setOpenCardPublicId}
              />
            ))}
          </div>
        )}
      </main>

      {openCardPublicId && (
        <CardDetailModal
          cardPublicId={openCardPublicId}
          boardPublicId={boardPublicId}
          boardLabels={boardLabels}
          onClose={() => setOpenCardPublicId(null)}
        />
      )}
    </>
  );
}
