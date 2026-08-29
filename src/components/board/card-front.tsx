// VI-009/VI-010/VI-011: label chips, title, then a meta row showing only the
// indicators that apply (FR-005) — due badge (color from server-computed dueStatus,
// never re-derived client-side per frontend-rules.md), checklist progress, comment
// count, member avatars. A card with nothing to show renders only its title. Clicking
// anywhere on the card opens its detail modal (specs/004-card-crud, US2).
// specs/005-drag-drop-ordering: draggable when the caller can mutate (VI-001 — reduced
// opacity while dragging); ListColumn reads the dragged card's id back out of
// dataTransfer on drop (research.md R-4), not via a prop callback.
import { useState } from "react";
import { Calendar, CheckSquare, FileText, MessageSquare } from "lucide-react";
import type { CardSummary } from "@/lib/api/boards-client";
import { DUE_STATUS_STYLES, formatDueLabel } from "@/lib/cards/due-status";
import { CARD_DRAG_DATA_TYPE } from "@/components/board/drag-data-types";
import { cn } from "@/lib/utils";

interface CardFrontProps {
  card: CardSummary;
  onClick: () => void;
  draggable: boolean;
}

export function CardFront({ card, onClick, draggable }: CardFrontProps) {
  const [isDragging, setIsDragging] = useState(false);
  const hasChecklist = card.checklistTotal !== null && card.checklistDone !== null;
  const hasMeta =
    card.hasDescription ||
    card.dueStatus !== null ||
    hasChecklist ||
    card.commentCount > 0 ||
    card.members.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      data-card-public-id={card.publicId}
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_DRAG_DATA_TYPE, card.publicId);
        event.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "w-full rounded-md border border-border bg-card p-3 text-left shadow-sm hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <span
              key={label.publicId}
              className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-card-foreground">{card.title}</p>

      {hasMeta && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {card.dueStatus && card.dueAt && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
                  DUE_STATUS_STYLES[card.dueStatus],
                )}
              >
                <Calendar className="size-3" />
                {formatDueLabel(card.dueAt)}
              </span>
            )}
            {card.hasDescription && (
              <FileText className="size-3.5" aria-label="Has description" />
            )}
            {hasChecklist && (
              <span className="flex items-center gap-1">
                <CheckSquare className="size-3.5" />
                {card.checklistDone}/{card.checklistTotal}
              </span>
            )}
            {card.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5" />
                {card.commentCount}
              </span>
            )}
          </div>

          {card.members.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.members.map((member) => (
                <span
                  key={member.publicId}
                  title={member.displayName}
                  className="flex size-5 items-center justify-center rounded-full border-2 border-card text-[0.6rem] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.initials}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
