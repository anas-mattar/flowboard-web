"use client";

// specs/007-search-filter US2: VI-005…009. Visual Compliance Loop (Phase 7) found the
// initial checkbox-based rows (mirroring card-labels-panel.tsx/card-members-panel.tsx)
// didn't match the reference screenshot/prototype: the prototype's own #pop rows
// (flowboard-prototype.html lines 804-809) are plain clickable rows with a trailing "✓"
// tick shown only once selected — no checkbox glyph at all — and its `.lab` swatch (line
// 88: 8px-tall colored bar, no embedded text) sits beside the plain-colored label name,
// not a colored badge with white text inside it. Rebuilt to match that exactly; this is a
// popover-specific row shape, distinct from the checkbox rows the card detail modal uses
// for the same data (a different surface, its own already-shipped convention).
// TopBar stays a server component (R-6); this island independently queries
// boards.getContent by the same query key BoardCanvas already primed with initialData
// (ADR-30's sibling-context lesson applied again: server data belongs in React Query,
// never duplicated into the ephemeral BoardFilterContext), so this never causes an extra
// network fetch — it shares BoardCanvas's cache entry.
import { Check, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { MemberAvatar } from "@/lib/api/boards-client";
import { deriveBoardLabels } from "@/lib/board/board-labels";
import { useBoardFilter } from "@/components/board/board-filter-context";
import type { DueBucket } from "@/lib/board/passes-board-filter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function PopRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted/60"
    >
      {children}
      {selected && <Check className="ml-auto size-3.5 text-emerald-600" />}
    </button>
  );
}

interface FilterPopoverProps {
  boardPublicId: string;
  members: MemberAvatar[];
}

const DUE_BUCKET_OPTIONS: { value: DueBucket; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "week", label: "Due in the next 7 days" },
  { value: "none", label: "No due date" },
];

export function FilterPopover({ boardPublicId, members }: FilterPopoverProps) {
  const { filter, toggleLabel, toggleMember, setDue } = useBoardFilter();
  const { data: board } = trpc.boards.getContent.useQuery({ boardPublicId });
  const boardLabels = board ? deriveBoardLabels(board) : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-sm text-foreground/70 hover:bg-foreground/5"
        >
          <Filter className="size-3.5" />
          Filter
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-64 flex-col gap-3">
        <h4 className="text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Filter cards
        </h4>

        <div className="flex flex-col gap-0.5">
          <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Labels</h5>
          {boardLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">This board has no labels yet.</p>
          ) : (
            boardLabels.map((label) => (
              <PopRow
                key={label.publicId}
                selected={filter.labelIds.includes(label.publicId)}
                onClick={() => toggleLabel(label.publicId)}
              >
                <span
                  className={cn("h-2 min-w-[34px] rounded-sm")}
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </PopRow>
            ))
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Members</h5>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No board members yet.</p>
          ) : (
            members.map((member) => (
              <PopRow
                key={member.publicId}
                selected={filter.memberIds.includes(member.publicId)}
                onClick={() => toggleMember(member.publicId)}
              >
                <span
                  className="flex size-6 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.initials}
                </span>
                {member.displayName}
              </PopRow>
            ))
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Due date</h5>
          {DUE_BUCKET_OPTIONS.map((option) => (
            <PopRow key={option.value} selected={filter.due === option.value} onClick={() => setDue(option.value)}>
              {option.label}
            </PopRow>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
