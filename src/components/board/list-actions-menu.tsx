"use client";

// specs/006-board-list-management: the list "⋯" popover — VI-005/VI-006/VI-007. Mirrors
// card-add-to-card-menu.tsx's shape: each destructive action gets its own inline confirm
// step (research.md R-7), no new dialog component. "Set WIP limit" is a collapsed row
// (showing a "(now N)" suffix only when a limit is set, VI-006) that expands into
// card-due-date-panel.tsx's own inline numeric-input-plus-Save shape on click.
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Target, ArrowDownUp, Archive, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { ListContent } from "@/lib/api/boards-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ListActionsMenuProps {
  list: ListContent;
  boardPublicId: string;
  onClosed: () => void;
}

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This list was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function ListActionsMenu({ list, boardPublicId, onClosed }: ListActionsMenuProps) {
  const [isEditingWipLimit, setIsEditingWipLimit] = useState(false);
  const [wipLimitDraft, setWipLimitDraft] = useState(list.wipLimit === null ? "" : String(list.wipLimit));
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const utils = trpc.useUtils();

  const updateMutation = trpc.lists.update.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      setIsEditingWipLimit(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const sortMutation = trpc.lists.sort.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      toast.success("Sorted by due date");
      onClosed();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const archiveCardsMutation = trpc.lists.archiveCards.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      toast.success("All cards archived");
      onClosed();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteListMutation = trpc.lists.delete.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      toast.success("List deleted");
      onClosed();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const saveWipLimit = () => {
    const trimmed = wipLimitDraft.trim();
    const wipLimit = trimmed.length === 0 ? null : Number(trimmed);
    if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 0)) {
      toast.error("wipLimit must not be negative");
      return;
    }
    updateMutation.mutate({ listPublicId: list.publicId, ifMatch: list.rowVersion, wipLimit });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">List actions</h4>

      {isEditingWipLimit ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-input p-2">
          <label htmlFor={`wip-limit-${list.publicId}`} className="text-xs font-medium text-muted-foreground">
            WIP limit
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              id={`wip-limit-${list.publicId}`}
              type="number"
              min={0}
              step={1}
              autoFocus
              placeholder="No limit"
              value={wipLimitDraft}
              disabled={updateMutation.isPending}
              onChange={(event) => setWipLimitDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveWipLimit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setWipLimitDraft(list.wipLimit === null ? "" : String(list.wipLimit));
                  setIsEditingWipLimit(false);
                }
              }}
              className="h-8"
            />
            <Button type="button" size="sm" disabled={updateMutation.isPending} onClick={saveWipLimit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={() => setIsEditingWipLimit(true)}
        >
          <Target /> Set WIP limit{list.wipLimit !== null ? ` (now ${list.wipLimit})` : ""}
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start"
        disabled={sortMutation.isPending}
        onClick={() => sortMutation.mutate({ listPublicId: list.publicId })}
      >
        <ArrowDownUp /> Sort by due date
      </Button>

      {confirmingArchive ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
          <p className="text-xs text-destructive">Archive every card in this list?</p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={archiveCardsMutation.isPending}
              onClick={() => archiveCardsMutation.mutate({ listPublicId: list.publicId })}
            >
              Archive
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingArchive(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={() => setConfirmingArchive(true)}
        >
          <Archive /> Archive all cards
        </Button>
      )}

      {confirmingDelete ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
          <p className="text-xs text-destructive">Delete this list? Its cards can be undone by an admin.</p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteListMutation.isPending}
              onClick={() => deleteListMutation.mutate({ listPublicId: list.publicId })}
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
          <Trash2 /> Delete list
        </Button>
      )}
    </div>
  );
}
