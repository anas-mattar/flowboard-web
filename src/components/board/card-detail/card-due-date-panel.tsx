"use client";

// US5 (C-08): set/clear a due date and toggle it complete, reusing the same update
// mutation US3 uses (plan.md ADR-17's If-Match applies here too). The badge color rule
// itself lives in card-front.tsx/lib/cards/due-status.ts — this panel only reads
// server-computed dueStatus back, never re-derives it.
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface CardDueDatePanelProps {
  cardPublicId: string;
  boardPublicId: string;
  dueAt: string | null;
  dueComplete: boolean;
  etag: string;
}

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This card was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

function toDateInputValue(dueAt: string | null): string {
  if (!dueAt) return "";
  return new Date(dueAt).toISOString().slice(0, 10);
}

export function CardDueDatePanel({
  cardPublicId,
  boardPublicId,
  dueAt,
  dueComplete,
  etag,
}: CardDueDatePanelProps) {
  const [draft, setDraft] = useState(toDateInputValue(dueAt));
  const utils = trpc.useUtils();

  const updateMutation = trpc.cards.update.useMutation({
    onSuccess: () => {
      utils.cards.getDetail.invalidate({ cardPublicId });
      utils.boards.getContent.invalidate({ boardPublicId });
    },
  });

  const runUpdate = async (fields: { dueAt?: string | null; dueComplete?: boolean }) => {
    try {
      await updateMutation.mutateAsync({ cardPublicId, ifMatch: etag, ...fields });
      toast.success("Due date updated");
    } catch (error) {
      toast.error(errorMessage(error));
      if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
        utils.cards.getDetail.invalidate({ cardPublicId });
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="date"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={dueComplete}
          disabled={!dueAt || updateMutation.isPending}
          onCheckedChange={(checked) => runUpdate({ dueComplete: checked === true })}
        />
        Mark complete
      </label>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={draft.length === 0 || updateMutation.isPending}
          onClick={() => runUpdate({ dueAt: new Date(draft).toISOString() })}
        >
          Save
        </Button>
        {dueAt && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() => {
              setDraft("");
              runUpdate({ dueAt: null, dueComplete: false });
            }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
