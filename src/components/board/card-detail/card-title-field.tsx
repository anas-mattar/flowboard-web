"use client";

// US3 (C-04): inline title edit in the modal header. Click-to-edit; Enter/blur saves,
// Escape cancels and discards. Uses the ETag captured by the shared cards.getDetail
// query as If-Match (plan.md ADR-17); a 409 means someone else changed the card first —
// re-fetch and surface it, never silently overwrite (FR-013).
import { useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";

interface CardTitleFieldProps {
  cardPublicId: string;
  boardPublicId: string;
  title: string;
  etag: string;
}

function errorMessage(error: unknown): string {
  if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
    return "This card was changed by someone else. Showing the latest version.";
  }
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardTitleField({ cardPublicId, boardPublicId, title, etag }: CardTitleFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const utils = trpc.useUtils();

  const updateMutation = trpc.cards.update.useMutation({
    onSuccess: () => {
      utils.cards.getDetail.invalidate({ cardPublicId });
      utils.boards.getContent.invalidate({ boardPublicId });
    },
  });

  const save = async () => {
    if (updateMutation.isPending) {
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed === title) {
      setValue(title);
      setIsEditing(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({ cardPublicId, ifMatch: etag, title: trimmed });
      toast.success("Card renamed");
      setIsEditing(false);
    } catch (error) {
      toast.error(errorMessage(error));
      if (isTRPCClientError(error) && error.data?.code === "CONFLICT") {
        utils.cards.getDetail.invalidate({ cardPublicId });
      }
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(title);
          setIsEditing(true);
        }}
        className="rounded px-1 py-0.5 text-left text-lg font-semibold hover:bg-muted/60"
      >
        {title}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      value={value}
      disabled={updateMutation.isPending}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setValue(title);
          setIsEditing(false);
        }
      }}
      className="text-lg font-semibold"
    />
  );
}
