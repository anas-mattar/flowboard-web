"use client";

// US4 (C-06): multi-select from the board's own labels only (invariant 7 — enforced
// server-side regardless of what this UI offers). Known limitation: no board-level
// label-listing endpoint exists yet, so `boardLabels` is derived by the parent from
// labels already assigned to at least one card on this board (see board-canvas.tsx and
// specs/004-card-crud/review-notes.md) — a label with zero cards today would not appear
// here until 004 or a later feature adds a real listing endpoint.
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { LabelSummary } from "@/lib/api/boards-client";
import { Checkbox } from "@/components/ui/checkbox";

interface CardLabelsPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  assignedLabels: LabelSummary[];
  boardLabels: LabelSummary[];
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardLabelsPanel({
  cardPublicId,
  boardPublicId,
  assignedLabels,
  boardLabels,
}: CardLabelsPanelProps) {
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.cards.getDetail.invalidate({ cardPublicId });
    utils.boards.getContent.invalidate({ boardPublicId });
  };

  const assignMutation = trpc.cards.assignLabel.useMutation({ onSuccess: invalidate });
  const removeMutation = trpc.cards.removeLabel.useMutation({ onSuccess: invalidate });

  const assignedIds = new Set(assignedLabels.map((label) => label.publicId));

  const onToggle = async (label: LabelSummary, checked: boolean) => {
    try {
      if (checked) {
        await assignMutation.mutateAsync({ cardPublicId, labelPublicId: label.publicId });
        toast.success(`Added "${label.name}" label`);
      } else {
        await removeMutation.mutateAsync({ cardPublicId, labelPublicId: label.publicId });
        toast.success(`Removed "${label.name}" label`);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (boardLabels.length === 0) {
    return <p className="text-sm text-muted-foreground">This board has no labels yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {boardLabels.map((label) => (
        <label key={label.publicId} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
          <Checkbox
            checked={assignedIds.has(label.publicId)}
            disabled={assignMutation.isPending || removeMutation.isPending}
            onCheckedChange={(checked) => onToggle(label, checked === true)}
          />
          <span
            className="flex-1 rounded px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        </label>
      ))}
    </div>
  );
}
