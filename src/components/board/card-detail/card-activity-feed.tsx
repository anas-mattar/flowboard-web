"use client";

// US7 (C-10): comment box + activity feed. The backend returns structured
// {type, payload} events (research.md R-6) — this is the one place that maps each type
// to a display template and formats the relative timestamp in the viewer's own
// locale/timezone; comment.added renders payload.body as the comment itself, not a
// templated action line. Available to every role including Observer (spec §6).
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { commentFormSchema, type CommentFormValues } from "@/lib/cards/schemas";
import type { ActivityEntry, CursorPage } from "@/lib/api/cards-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

interface CardActivityFeedProps {
  cardPublicId: string;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

function describe(entry: ActivityEntry): string | null {
  const payload = entry.payload as Record<string, unknown>;
  switch (entry.type) {
    case "card.created":
      return "created this card";
    case "card.renamed":
      return `renamed this card to "${payload.title}"`;
    case "card.described":
      return "updated the description";
    case "label.added":
      return `added the "${payload.labelName}" label`;
    case "label.removed":
      return `removed the "${payload.labelName}" label`;
    case "member.assigned":
      return `added ${payload.memberDisplayName} to this card`;
    case "member.unassigned":
      return `removed ${payload.memberDisplayName} from this card`;
    case "due.set":
      return `set the due date to ${new Date(payload.dueAt as string).toLocaleDateString()}`;
    case "due.cleared":
      return "cleared the due date";
    case "due.completed":
      return "marked the due date complete";
    case "checklist.item.added":
      return `added checklist item "${payload.text}"`;
    case "checklist.item.checked":
      return `checked "${payload.text}"`;
    case "checklist.item.unchecked":
      return `unchecked "${payload.text}"`;
    case "checklist.item.deleted":
      return `deleted checklist item "${payload.text}"`;
    case "card.moved":
      return `moved this card from ${payload.fromListName} to ${payload.toListName}`;
    default:
      return null;
  }
}

export function CardActivityFeed({ cardPublicId }: CardActivityFeedProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pages, setPages] = useState<ActivityEntry[][]>([]);
  const [lastData, setLastData] = useState<CursorPage<ActivityEntry> | undefined>(undefined);
  const utils = trpc.useUtils();
  const activityQuery = trpc.cards.getActivity.useQuery({ cardPublicId, cursor });

  // Render-time state adjustment (react.dev "You Might Not Need an Effect") instead of a
  // useEffect: each new page object react-query hands back (by reference) either starts a
  // fresh first page (cursor undefined — including after an invalidate/refetch) or appends.
  if (activityQuery.data && activityQuery.data !== lastData) {
    setLastData(activityQuery.data);
    setPages((previous) =>
      cursor === undefined ? [activityQuery.data!.items] : [...previous, activityQuery.data!.items],
    );
  }

  const items = pages.flat();

  const commentMutation = trpc.cards.addComment.useMutation({
    onSuccess: () => {
      setCursor(undefined);
      utils.cards.getActivity.invalidate({ cardPublicId });
    },
  });

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: "" },
  });

  const onSubmit = async (values: CommentFormValues) => {
    try {
      await commentMutation.mutateAsync({ cardPublicId, body: values.body });
      form.reset({ body: "" });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Activity
      </h4>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mb-4 flex flex-col gap-2">
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Write a comment…"
                    rows={2}
                    disabled={commentMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" className="self-start" disabled={commentMutation.isPending}>
            Comment
          </Button>
        </form>
      </Form>

      {activityQuery.isLoading && pages.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      )}
      {activityQuery.isError && (
        <p className="text-sm text-destructive">Couldn&apos;t load activity.</p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="flex gap-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-medium text-white"
                style={{ backgroundColor: entry.actorAvatarColor }}
              >
                {entry.actorInitials}
              </span>
              <div className="min-w-0 flex-1">
                {entry.type === "comment.added" ? (
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs font-medium">{entry.actorDisplayName}</p>
                    <p className="whitespace-pre-wrap text-sm">
                      {(entry.payload as Record<string, unknown>).body as string}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">
                    <span className="font-medium">{entry.actorDisplayName}</span>{" "}
                    <span className="text-muted-foreground">{describe(entry)}</span>
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activityQuery.data?.nextCursor && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setCursor(activityQuery.data!.nextCursor!)}
        >
          Load more
        </Button>
      )}
    </section>
  );
}
