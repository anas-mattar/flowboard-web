"use client";

// US6 (C-09): add/tick/delete checklist items, progress bar and done/total shown here
// mirror the card-front badge (same aggregate values, computed server-side).
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { ChecklistItemDetail } from "@/lib/api/cards-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface CardChecklistPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  items: ChecklistItemDetail[];
  canMutate: boolean;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardChecklistPanel({ cardPublicId, boardPublicId, items, canMutate }: CardChecklistPanelProps) {
  const [draft, setDraft] = useState("");
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.cards.getDetail.invalidate({ cardPublicId });
    utils.boards.getContent.invalidate({ boardPublicId });
  };

  const addMutation = trpc.cards.addChecklistItem.useMutation({ onSuccess: invalidate });
  const toggleMutation = trpc.cards.toggleChecklistItem.useMutation({ onSuccess: invalidate });
  const deleteMutation = trpc.cards.deleteChecklistItem.useMutation({ onSuccess: invalidate });

  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const onAdd = async () => {
    const text = draft.trim();
    if (text.length === 0) return;
    try {
      await addMutation.mutateAsync({ cardPublicId, text });
      setDraft("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onToggle = async (item: ChecklistItemDetail, isDone: boolean) => {
    try {
      await toggleMutation.mutateAsync({ checklistItemPublicId: item.publicId, done: isDone });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onDelete = async (item: ChecklistItemDetail) => {
    try {
      await deleteMutation.mutateAsync({ checklistItemPublicId: item.publicId });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Checklist</h4>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {done}/{total}
          </span>
        )}
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      {total === 0 && <p className="mb-2 text-sm text-muted-foreground">No checklist items yet.</p>}

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.publicId} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
            <Checkbox
              checked={item.done}
              disabled={!canMutate || toggleMutation.isPending}
              onCheckedChange={(checked) => onToggle(item, checked === true)}
            />
            <span className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
              {item.text}
            </span>
            {canMutate && (
              <button
                type="button"
                aria-label="Delete checklist item"
                disabled={deleteMutation.isPending}
                onClick={() => onDelete(item)}
                className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canMutate && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={draft}
            placeholder="Add an item"
            disabled={addMutation.isPending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
          />
          <Button size="sm" disabled={draft.trim().length === 0 || addMutation.isPending} onClick={onAdd}>
            Add
          </Button>
        </div>
      )}
    </section>
  );
}
