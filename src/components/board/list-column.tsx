// VI-007/VI-008: header (name, WIP/count pill, "⋯" menu) + cards stacked top-to-bottom
// + an "+ Add a card" footer. The pill/menu/footer controls are inert (FR-007) — list
// creation/reordering/editing belongs to 006. The count pill uses List.WipLimit
// (display-only, invariant 3 — never enforced here): plain count when unset, red
// count/limit when the count exceeds it, gray otherwise.
import { MoreHorizontal, Plus } from "lucide-react";
import type { ListContent } from "@/lib/api/boards-client";
import { CardFront } from "@/components/board/card-front";
import { cn } from "@/lib/utils";

interface ListColumnProps {
  list: ListContent;
}

export function ListColumn({ list }: ListColumnProps) {
  const exceeded = list.wipLimit !== null && list.cardCount > list.wipLimit;
  const pillLabel =
    list.wipLimit !== null ? `${list.cardCount}/${list.wipLimit}` : `${list.cardCount}`;

  return (
    // VI-006: each list is a white card, visually distinct from the canvas's own
    // (light gray) background — not the same muted-gray tone at a different opacity.
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2 px-1 py-1">
        <h3 className="flex-1 truncate text-sm font-semibold">{list.name}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            exceeded
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {pillLabel}
        </span>
        <button
          type="button"
          disabled
          aria-label="List options (not available yet)"
          className="rounded p-1 text-muted-foreground/60"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-1 py-1">
        {list.cards.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">No cards yet.</p>
        )}
        {list.cards.map((card) => (
          <CardFront key={card.publicId} card={card} />
        ))}
      </div>

      <button
        type="button"
        disabled
        className="mt-1 flex items-center gap-1 rounded px-1 py-1.5 text-left text-sm text-muted-foreground/70"
      >
        <Plus className="size-3.5" />
        Add a card
      </button>
    </div>
  );
}
