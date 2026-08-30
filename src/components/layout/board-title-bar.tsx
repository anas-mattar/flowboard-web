"use client";

// specs/006-board-list-management: replaces top-bar.tsx's static h1 + disabled Star
// button (003). Inline title rename mirrors card-title-field.tsx's click-to-edit shape;
// star/unstar mirrors that same If-Match-free toggle (research.md, board-list-management
// contract); the BoardAdmin-only delete control mirrors card-add-to-card-menu.tsx's own
// inline confirm-step shape (research.md R-7) — no new dialog component.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { BoardContent } from "@/lib/api/boards-client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BoardTitleBarProps {
  boardPublicId: string;
  initialBoard: BoardContent;
}

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This board was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function BoardTitleBar({ boardPublicId, initialBoard }: BoardTitleBarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  // Same query key board-canvas.tsx already reads (React Query dedupes by key) — both
  // components stay in sync with every mutation's invalidation, no separate fetch.
  const { data: board } = trpc.boards.getContent.useQuery({ boardPublicId }, { initialData: initialBoard });
  const activeBoard = board ?? initialBoard;

  const membersQuery = trpc.boardMembers.list.useQuery({ boardPublicId });
  const viewerEntry = membersQuery.data?.members.find(
    (member) => member.user.publicId === session?.user?.publicId,
  );
  // FR-004/ADR-25: board rename/star/delete is narrower than list mutations —
  // rename/delete need CanManageBoard (BoardAdmin only), star only needs CanMutate.
  const isBoardAdmin = viewerEntry?.role === "BoardAdmin";
  const canMutate = !viewerEntry || viewerEntry.role !== "Observer";

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeBoard.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const renameMutation = trpc.boards.rename.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      utils.boards.list.invalidate();
    },
  });
  const starMutation = trpc.boards.star.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      utils.boards.list.invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const unstarMutation = trpc.boards.unstar.useMutation({
    onSuccess: () => {
      utils.boards.getContent.invalidate({ boardPublicId });
      utils.boards.list.invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const deleteMutation = trpc.boards.delete.useMutation({
    onSuccess: () => {
      utils.boards.list.invalidate();
      toast.success("Board deleted");
      router.push("/");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const saveName = async () => {
    if (renameMutation.isPending) {
      return;
    }

    const trimmed = nameDraft.trim();
    if (trimmed.length === 0 || trimmed === activeBoard.name) {
      setNameDraft(activeBoard.name);
      setIsEditingName(false);
      return;
    }

    try {
      await renameMutation.mutateAsync({ boardPublicId, ifMatch: activeBoard.rowVersion, name: trimmed });
      toast.success("Board renamed");
      setIsEditingName(false);
    } catch (error) {
      toast.error(errorMessage(error));
      if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
        utils.boards.getContent.invalidate({ boardPublicId });
      }
      setIsEditingName(false);
    }
  };

  const toggleStar = () => {
    if (starMutation.isPending || unstarMutation.isPending) {
      return;
    }
    if (activeBoard.starred) {
      unstarMutation.mutate({ boardPublicId });
    } else {
      starMutation.mutate({ boardPublicId });
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-3">
      {isEditingName && isBoardAdmin ? (
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
              setNameDraft(activeBoard.name);
              setIsEditingName(false);
            }
          }}
          className="h-8 max-w-64 text-lg font-bold tracking-tight"
        />
      ) : isBoardAdmin ? (
        <button
          type="button"
          onClick={() => {
            setNameDraft(activeBoard.name);
            setIsEditingName(true);
          }}
          className="truncate rounded px-1 py-0.5 text-left text-lg font-bold tracking-tight hover:bg-muted/60"
        >
          {activeBoard.name}
        </button>
      ) : (
        <h1 className="truncate text-lg font-bold tracking-tight">{activeBoard.name}</h1>
      )}

      {canMutate && (
        <button
          type="button"
          onClick={toggleStar}
          disabled={starMutation.isPending || unstarMutation.isPending}
          aria-label={activeBoard.starred ? "Unstar this board" : "Star this board"}
          className="text-foreground/60 hover:text-foreground disabled:opacity-60"
        >
          <Star className={cn("size-4", activeBoard.starred && "fill-amber-500 text-amber-500")} />
        </button>
      )}

      {isBoardAdmin &&
        (confirmingDelete ? (
          <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1">
            <span className="text-xs text-destructive">Delete this board?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ boardPublicId })}
            >
              Delete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label="Delete board"
            className="text-foreground/40 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        ))}
    </div>
  );
}
