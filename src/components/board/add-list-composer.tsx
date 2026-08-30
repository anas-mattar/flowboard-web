"use client";

// US2 (L-01): the board canvas's trailing "+ Add another list" control — mirrors
// card-composer.tsx's inline composer shape exactly (research.md R-6), no native
// prompt(). Appends via Ordering.Append server-side (ADR-28) — always rightmost.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { createListFormSchema, type CreateListFormValues } from "@/lib/lists/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

interface AddListComposerProps {
  boardPublicId: string;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function AddListComposer({ boardPublicId }: AddListComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.lists.create.useMutation({
    onSuccess: () => utils.boards.getContent.invalidate({ boardPublicId }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const form = useForm<CreateListFormValues>({
    resolver: zodResolver(createListFormSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: CreateListFormValues) => {
    try {
      await createMutation.mutateAsync({ boardPublicId, name: values.name });
      form.reset({ name: "" });
    } catch {
      // errorMessage/toast already handled in onError; keep the composer open to retry.
    }
  };

  const onCancel = () => {
    form.reset({ name: "" });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-fit w-72 shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60"
      >
        <Plus className="size-4" />
        Add another list
      </button>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-card p-2 shadow-sm"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  autoFocus
                  placeholder="Enter list name"
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
            Add list
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
