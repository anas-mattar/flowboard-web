"use client";

// VI-007/VI-008: header (name, WIP/count pill, "⋯" menu) + cards stacked top-to-bottom
// + a real "+ Add a card" composer (specs/004-card-crud, US1). The pill/menu controls
// stay inert (FR-007) — list creation/reordering/editing belongs to 006. The count pill
// uses List.WipLimit (display-only, invariant 3 — never enforced here): plain count when
// unset, red count/limit when the count exceeds it, gray otherwise.
// specs/005-drag-drop-ordering: cards drag within/across lists (US1, VI-001/VI-002) and
// the list header itself drags to reorder lists (US3, VI-008) — plan.md ADR-22
// (optimistic `boards.getContent` cache patch + snapshot-restore) and ADR-23 (native
// HTML5 drag only, no library). The two drag kinds share this column's DOM footprint but
// never collide: each uses its own dataTransfer MIME type (drag-data-types.ts), which is
// the only thing readable during dragover (browsers block `.getData()` until `drop`).
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { BoardContent, CardSummary, ListContent } from "@/lib/api/boards-client";
import { CardFront } from "@/components/board/card-front";
import { CardComposer } from "@/components/board/card-composer";
import { ListActionsMenu } from "@/components/board/list-actions-menu";
import { CARD_DRAG_DATA_TYPE, LIST_DRAG_DATA_TYPE } from "@/components/board/drag-data-types";
import { useBoardFilter } from "@/components/board/board-filter-context";
import { passesBoardFilter } from "@/lib/board/passes-board-filter";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This list was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

interface ListColumnProps {
  list: ListContent;
  boardPublicId: string;
  onOpenCard: (cardPublicId: string) => void;
  canMutate: boolean;
  isListDragOverTarget: boolean;
}

// research.md R-4: the first sibling whose own bounding-box midpoint (on the drag axis)
// is below the pointer is the "insert before" target; if the pointer is past every
// sibling's midpoint, undefined means "append at the end".
export function resolveBeforeSiblingPublicId(
  container: HTMLElement,
  pointerCoordinate: number,
  attribute: "data-card-public-id" | "data-list-public-id",
  axis: "vertical" | "horizontal",
  excludePublicId: string,
): string | undefined {
  const siblings = Array.from(container.querySelectorAll<HTMLElement>(`[${attribute}]`));
  for (const el of siblings) {
    const publicId = el.getAttribute(attribute);
    if (!publicId || publicId === excludePublicId) continue;
    const rect = el.getBoundingClientRect();
    const midpoint = axis === "vertical" ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    if (pointerCoordinate < midpoint) {
      return publicId;
    }
  }
  return undefined;
}

// plan.md ADR-22: a full snapshot-and-restore of the `boards.getContent` cache entry, not
// a computed reverse-patch (research.md R-5). This function only ever reorders arrays for
// display — the server-owned `Position` values are never computed or stored here
// (frontend-rules.md), and the next `onSettled` invalidation reconciles the real order.
function applyOptimisticCardMove(
  board: BoardContent,
  input: { cardPublicId: string; listPublicId: string; beforeCardPublicId?: string },
): BoardContent {
  let movedCard: CardSummary | undefined;
  const withoutCard = board.lists.map((l) => {
    const index = l.cards.findIndex((c) => c.publicId === input.cardPublicId);
    if (index === -1) return l;
    movedCard = l.cards[index];
    const cards = [...l.cards.slice(0, index), ...l.cards.slice(index + 1)];
    return { ...l, cards, cardCount: cards.length };
  });

  if (!movedCard) return board;
  const card = movedCard;

  const lists = withoutCard.map((l) => {
    if (l.publicId !== input.listPublicId) return l;
    const insertIndex = input.beforeCardPublicId
      ? l.cards.findIndex((c) => c.publicId === input.beforeCardPublicId)
      : -1;
    const cards =
      insertIndex === -1
        ? [...l.cards, card]
        : [...l.cards.slice(0, insertIndex), card, ...l.cards.slice(insertIndex)];
    return { ...l, cards, cardCount: cards.length };
  });

  return { ...board, lists };
}

export function ListColumn({
  list,
  boardPublicId,
  onOpenCard,
  canMutate,
  isListDragOverTarget,
}: ListColumnProps) {
  const [isCardDragOver, setIsCardDragOver] = useState(false);
  const [isListDragging, setIsListDragging] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(list.name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const utils = trpc.useUtils();

  // US4: mirrors card-title-field.tsx's click-to-edit shape exactly.
  const renameMutation = trpc.lists.update.useMutation({
    onSuccess: () => utils.boards.getContent.invalidate({ boardPublicId }),
  });

  const saveName = async () => {
    if (renameMutation.isPending) {
      return;
    }

    const trimmed = nameDraft.trim();
    if (trimmed.length === 0 || trimmed === list.name) {
      setNameDraft(list.name);
      setIsEditingName(false);
      return;
    }

    try {
      await renameMutation.mutateAsync({ listPublicId: list.publicId, ifMatch: list.rowVersion, name: trimmed });
      toast.success("List renamed");
      setIsEditingName(false);
    } catch (error) {
      toast.error(errorMessage(error));
      if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
        utils.boards.getContent.invalidate({ boardPublicId });
      }
      setIsEditingName(false);
    }
  };

  const moveCardMutation = trpc.cards.move.useMutation({
    onMutate: async (input) => {
      await utils.boards.getContent.cancel({ boardPublicId });
      const previous = utils.boards.getContent.getData({ boardPublicId });
      utils.boards.getContent.setData({ boardPublicId }, (old) =>
        old ? applyOptimisticCardMove(old, input) : old,
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

  const exceeded = list.wipLimit !== null && list.cardCount > list.wipLimit;
  const pillLabel =
    list.wipLimit !== null ? `${list.cardCount}/${list.wipLimit}` : `${list.cardCount}`;

  // specs/007-search-filter US1/FR-008: filtering only changes what renders here — it
  // never touches list.cardCount/list.wipLimit above, which stay the list's true count.
  const { filter } = useBoardFilter();
  const visibleCards = list.cards.filter((card) => passesBoardFilter(card, filter));

  const onCardDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canMutate || !event.dataTransfer.types.includes(CARD_DRAG_DATA_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsCardDragOver(true);
  };

  const onCardDragLeave = () => setIsCardDragOver(false);

  const onCardDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canMutate || !event.dataTransfer.types.includes(CARD_DRAG_DATA_TYPE)) return;
    event.preventDefault();
    setIsCardDragOver(false);
    const cardPublicId = event.dataTransfer.getData(CARD_DRAG_DATA_TYPE);
    if (!cardPublicId) return;

    const beforeCardPublicId = resolveBeforeSiblingPublicId(
      event.currentTarget,
      event.clientY,
      "data-card-public-id",
      "vertical",
      cardPublicId,
    );
    moveCardMutation.mutate({ cardPublicId, listPublicId: list.publicId, beforeCardPublicId });
  };

  return (
    // VI-006: each list is a white card, visually distinct from the canvas's own
    // (light gray) background — not the same muted-gray tone at a different opacity.
    <div
      data-list-public-id={list.publicId}
      onDragOver={onCardDragOver}
      onDragLeave={onCardDragLeave}
      onDrop={onCardDrop}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg bg-card p-2 shadow-sm",
        (isCardDragOver || isListDragOverTarget) && "outline-2 outline-dashed outline-ring",
        isListDragging && "opacity-40",
      )}
    >
      <div
        className="flex items-center gap-2 px-1 py-1"
        draggable={canMutate && !isEditingName}
        onDragStart={(event) => {
          if (!canMutate) return;
          event.dataTransfer.setData(LIST_DRAG_DATA_TYPE, list.publicId);
          event.dataTransfer.effectAllowed = "move";
          setIsListDragging(true);
        }}
        onDragEnd={() => setIsListDragging(false)}
      >
        {isEditingName && canMutate ? (
          <Input
            autoFocus
            value={nameDraft}
            disabled={renameMutation.isPending}
            onChange={(event) => setNameDraft(event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={saveName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveName();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setNameDraft(list.name);
                setIsEditingName(false);
              }
            }}
            className="h-7 flex-1 text-sm font-semibold"
          />
        ) : canMutate ? (
          <button
            type="button"
            onClick={() => {
              setNameDraft(list.name);
              setIsEditingName(true);
            }}
            className="flex-1 truncate rounded px-1 py-0.5 text-left text-sm font-semibold hover:bg-muted/60"
          >
            {list.name}
          </button>
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold">{list.name}</h3>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            exceeded
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {pillLabel}
        </span>
        {canMutate && (
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="List options"
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <ListActionsMenu list={list} boardPublicId={boardPublicId} onClosed={() => setIsMenuOpen(false)} />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex flex-col gap-2 px-1 py-1">
        {visibleCards.length === 0 && list.cards.length > 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">No cards match the filter</p>
        )}
        {visibleCards.length === 0 && list.cards.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">No cards yet.</p>
        )}
        {visibleCards.map((card) => (
          <CardFront
            key={card.publicId}
            card={card}
            onClick={() => onOpenCard(card.publicId)}
            draggable={canMutate}
          />
        ))}
      </div>

      {canMutate && <CardComposer listPublicId={list.publicId} boardPublicId={boardPublicId} />}
    </div>
  );
}
