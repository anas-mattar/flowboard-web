"use client";

// VI-008: the right-column "Add to card" panel — Members, Labels, Due date, Move
// (inert per FR-016/FR-017 — 005's scope), Copy, Delete. Each of Members/Labels/Due
// date opens a popover with the actual picker; Copy/Delete act immediately (Delete
// requires an inline confirmation step first, per spec.md's edge case).
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Tag, Users, Calendar, Move, Copy, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { CardDetail } from "@/lib/api/cards-client";
import type { LabelSummary } from "@/lib/api/boards-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CardLabelsPanel } from "@/components/board/card-detail/card-labels-panel";
import { CardMembersPanel } from "@/components/board/card-detail/card-members-panel";
import { CardDueDatePanel } from "@/components/board/card-detail/card-due-date-panel";

interface CardAddToCardMenuProps {
  card: CardDetail;
  etag: string;
  boardPublicId: string;
  boardLabels: LabelSummary[];
  onClosed: () => void;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardAddToCardMenu({ card, etag, boardPublicId, boardLabels, onClosed }: CardAddToCardMenuProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const utils = trpc.useUtils();

  const copyMutation = trpc.cards.copy.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      toast.success("Card copied");
      onClosed();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = trpc.cards.delete.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      toast.success("Card deleted");
      onClosed();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Add to card
      </h4>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="justify-start">
            <Users /> Members
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <CardMembersPanel cardPublicId={card.publicId} boardPublicId={boardPublicId} assignedMembers={card.members} />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="justify-start">
            <Tag /> Labels
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <CardLabelsPanel
            cardPublicId={card.publicId}
            boardPublicId={boardPublicId}
            assignedLabels={card.labels}
            boardLabels={boardLabels}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="justify-start">
            <Calendar /> Due date
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <CardDueDatePanel
            cardPublicId={card.publicId}
            boardPublicId={boardPublicId}
            dueAt={card.dueAt}
            dueComplete={card.dueComplete}
            etag={etag}
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        aria-label="Move (not available yet)"
        className="justify-start"
      >
        <Move /> Move
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start"
        disabled={copyMutation.isPending}
        onClick={() => copyMutation.mutate({ cardPublicId: card.publicId })}
      >
        <Copy /> Copy
      </Button>

      {confirmingDelete ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
          <p className="text-xs text-destructive">Delete this card? This can be undone by an admin.</p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ cardPublicId: card.publicId })}
            >
              Delete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start text-destructive"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 /> Delete
        </Button>
      )}
    </div>
  );
}
