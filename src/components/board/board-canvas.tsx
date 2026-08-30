"use client";

// VI-006: lists arranged left-to-right, each list a fixed-width column with its own
// background distinct from the canvas. Lists/cards render in the stored order the
// backend already returned (invariant 2) — this component MUST NOT re-sort them.
// plan.md ADR-19: this is now the client-driven owner of the board's live data
// (trpc.boards.getContent.useQuery, seeded with the server component's initialData so
// the first paint is unchanged) — every card mutation invalidates this same query.
// plan.md ADR-14: the open card is plain client-side dialog state, not a route.
// specs/005-drag-drop-ordering (US3): this is also the list-level drop zone — lists
// reorder by dragging (VI-008/VI-009), resolved horizontally the same way list-column.tsx
// resolves a card drop vertically (research.md R-4), with the same optimistic-update /
// snapshot-restore shape (ADR-22).
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import type { BoardContent, LabelSummary } from "@/lib/api/boards-client";
import { ListColumn, resolveBeforeSiblingPublicId } from "@/components/board/list-column";
import { AddListComposer } from "@/components/board/add-list-composer";
import { CardDetailModal } from "@/components/board/card-detail/card-detail-modal";
import { LIST_DRAG_DATA_TYPE } from "@/components/board/drag-data-types";

interface BoardCanvasProps {
  boardPublicId: string;
  initialBoard: BoardContent;
}

function applyOptimisticListMove(
  board: BoardContent,
  input: { listPublicId: string; beforeListPublicId?: string },
): BoardContent {
  const index = board.lists.findIndex((l) => l.publicId === input.listPublicId);
  if (index === -1) return board;
  const moved = board.lists[index];
  const withoutList = [...board.lists.slice(0, index), ...board.lists.slice(index + 1)];
  const insertIndex = input.beforeListPublicId
    ? withoutList.findIndex((l) => l.publicId === input.beforeListPublicId)
    : -1;
  const lists =
    insertIndex === -1
      ? [...withoutList, moved]
      : [...withoutList.slice(0, insertIndex), moved, ...withoutList.slice(insertIndex)];
  return { ...board, lists };
}

export function BoardCanvas({ boardPublicId, initialBoard }: BoardCanvasProps) {
  const [openCardPublicId, setOpenCardPublicId] = useState<string | null>(null);
  const [listDragOverTargetId, setListDragOverTargetId] = useState<string | null>(null);
  const { data: board } = trpc.boards.getContent.useQuery(
    { boardPublicId },
    { initialData: initialBoard },
  );
  const activeBoard = board ?? initialBoard;
  const utils = trpc.useUtils();

  const moveListMutation = trpc.lists.move.useMutation({
    onMutate: async (input) => {
      await utils.boards.getContent.cancel({ boardPublicId });
      const previous = utils.boards.getContent.getData({ boardPublicId });
      utils.boards.getContent.setData({ boardPublicId }, (old) =>
        old ? applyOptimisticListMove(old, input) : old,
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.boards.getContent.setData({ boardPublicId }, context.previous);
      }
    },
    onSettled: () => utils.boards.getContent.invalidate({ boardPublicId }),
  });

  // Spec §6 / frontend-rules.md: Observer can view and comment only — every card
  // mutation (add a card, and everything inside the detail modal) is hidden for that
  // role. UX only; the backend's own CanMutate check is what actually enforces it.
  const { data: session } = useSession();
  const membersQuery = trpc.boardMembers.list.useQuery({ boardPublicId });
  const viewerEntry = membersQuery.data?.members.find(
    (member) => member.user.publicId === session?.user?.publicId,
  );
  const canMutate = !viewerEntry || viewerEntry.role !== "Observer";

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

  const onListDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canMutate || !event.dataTransfer.types.includes(LIST_DRAG_DATA_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const hovered = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-list-public-id]");
    setListDragOverTargetId(hovered?.getAttribute("data-list-public-id") ?? null);
  };

  const onListDragLeave = () => setListDragOverTargetId(null);

  const onListDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canMutate || !event.dataTransfer.types.includes(LIST_DRAG_DATA_TYPE)) return;
    event.preventDefault();
    setListDragOverTargetId(null);
    const listPublicId = event.dataTransfer.getData(LIST_DRAG_DATA_TYPE);
    if (!listPublicId) return;

    const beforeListPublicId = resolveBeforeSiblingPublicId(
      event.currentTarget,
      event.clientX,
      "data-list-public-id",
      "horizontal",
      listPublicId,
    );
    moveListMutation.mutate({ listPublicId, beforeListPublicId });
  };

  return (
    <>
      <main className="flex-1 overflow-x-auto overflow-y-auto bg-muted/20 p-4">
        {activeBoard.lists.length === 0 && !canMutate ? (
          <p className="text-sm text-muted-foreground">This board has no lists yet.</p>
        ) : (
          <div
            onDragOver={onListDragOver}
            onDragLeave={onListDragLeave}
            onDrop={onListDrop}
            className="flex h-full items-start gap-4"
          >
            {activeBoard.lists.map((list) => (
              <ListColumn
                key={list.publicId}
                list={list}
                boardPublicId={boardPublicId}
                onOpenCard={setOpenCardPublicId}
                canMutate={canMutate}
                isListDragOverTarget={listDragOverTargetId === list.publicId}
              />
            ))}
            {canMutate && <AddListComposer boardPublicId={boardPublicId} />}
          </div>
        )}
      </main>

      {openCardPublicId && (
        <CardDetailModal
          cardPublicId={openCardPublicId}
          boardPublicId={boardPublicId}
          boardLabels={boardLabels}
          boardLists={activeBoard.lists}
          onClose={() => setOpenCardPublicId(null)}
          canMutate={canMutate}
        />
      )}
    </>
  );
}
