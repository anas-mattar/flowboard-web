"use client";

// specs/005-drag-drop-ordering (US2/C-11): the "Move" button's keyboard-operable
// alternative to dragging — every list on the board, a checkmark beside the card's
// current list, choosing it again is a no-op (spec.md Acceptance Scenarios). Always
// appends at the end of the chosen list (contracts/move-api.md — no in-list position
// choice from this menu). Mirrors card-labels-panel.tsx's shape.
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { ListContent } from "@/lib/api/boards-client";

interface CardMovePanelProps {
  cardPublicId: string;
  boardPublicId: string;
  currentListPublicId: string;
  boardLists: ListContent[];
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardMovePanel({
  cardPublicId,
  boardPublicId,
  currentListPublicId,
  boardLists,
}: CardMovePanelProps) {
  const utils = trpc.useUtils();
  const moveMutation = trpc.cards.move.useMutation({
    onSuccess: () => {
      utils.cards.getDetail.invalidate({ cardPublicId });
      utils.boards.getContent.invalidate({ boardPublicId });
    },
  });

  const onSelect = async (list: ListContent) => {
    if (list.publicId === currentListPublicId) {
      return;
    }
    try {
      await moveMutation.mutateAsync({ cardPublicId, listPublicId: list.publicId });
      toast.success(`Moved to "${list.name}"`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Move to list
      </h4>
      {boardLists.map((list) => (
        <button
          key={list.publicId}
          type="button"
          disabled={moveMutation.isPending}
          onClick={() => onSelect(list)}
          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60"
        >
          <span className="truncate">{list.name}</span>
          {list.publicId === currentListPublicId && <Check className="size-4 shrink-0" />}
        </button>
      ))}
    </div>
  );
}
