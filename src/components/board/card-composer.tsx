"use client";

// US1 (C-01): inline composer at the bottom of a list. Enter commits and keeps the
// composer open for rapid entry (form.reset keeps isOpen true); Escape cancels and
// discards whatever was typed (frontend-rules.md's inline-edit contract).
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cardComposerFormSchema, type CardComposerFormValues } from "@/lib/cards/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

interface CardComposerProps {
  listPublicId: string;
  boardPublicId: string;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardComposer({ listPublicId, boardPublicId }: CardComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.cards.create.useMutation({
    onSuccess: () => utils.boards.getContent.invalidate({ boardPublicId }),
  });

  const form = useForm<CardComposerFormValues>({
    resolver: zodResolver(cardComposerFormSchema),
    defaultValues: { title: "" },
  });

  const onSubmit = async (values: CardComposerFormValues) => {
    try {
      await createMutation.mutateAsync({ listPublicId, title: values.title });
      form.reset({ title: "" });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onCancel = () => {
    form.reset({ title: "" });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-1 flex items-center gap-1 rounded px-1 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/60"
      >
        <Plus className="size-3.5" />
        Add a card
      </button>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-1 flex flex-col gap-2 px-1">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  autoFocus
                  placeholder="Enter a title for this card"
                  disabled={createMutation.isPending}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancel();
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            Add card
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
