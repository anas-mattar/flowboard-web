"use client";

// US3 (C-05): plain-text description, saved explicitly via a Save button (never
// autosave — spec.md Assumptions). Rendered via whitespace-pre-wrap, never
// dangerouslySetInnerHTML (plan.md ADR-15 — the prototype screenshot shows a plain
// textarea, overriding FUNCTIONAL_SPEC's "rich-text" wording per the Source-of-Truth
// Hierarchy). On a stale If-Match (409), re-fetch and show the "changed by someone
// else" toast instead of silently overwriting (FR-013).
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CardDescriptionPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  description: string | null;
  etag: string;
}

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This card was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardDescriptionPanel({
  cardPublicId,
  boardPublicId,
  description,
  etag,
}: CardDescriptionPanelProps) {
  const [value, setValue] = useState(description ?? "");
  // Render-time state adjustment (react.dev "You Might Not Need an Effect") — keeps the
  // draft in sync when the underlying card changes from elsewhere (e.g. after a conflict
  // re-fetch), without a useEffect-based setState.
  const [lastDescription, setLastDescription] = useState(description);
  if (description !== lastDescription) {
    setLastDescription(description);
    setValue(description ?? "");
  }
  const utils = trpc.useUtils();

  const updateMutation = trpc.cards.update.useMutation({
    onSuccess: () => {
      utils.cards.getDetail.invalidate({ cardPublicId });
      utils.boards.getContent.invalidate({ boardPublicId });
    },
  });

  const isDirty = value !== (description ?? "");

  const onSave = async () => {
    try {
      await updateMutation.mutateAsync({
        cardPublicId,
        ifMatch: etag,
        description: value.trim().length === 0 ? null : value,
      });
      toast.success("Description saved");
    } catch (error) {
      toast.error(errorMessage(error));
      if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
        utils.cards.getDetail.invalidate({ cardPublicId });
      }
    }
  };

  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Description
      </h4>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add a more detailed description…"
        rows={4}
        disabled={updateMutation.isPending}
        className="whitespace-pre-wrap"
      />
      {isDirty && (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" disabled={updateMutation.isPending} onClick={onSave}>
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() => setValue(description ?? "")}
          >
            Cancel
          </Button>
        </div>
      )}
    </section>
  );
}
