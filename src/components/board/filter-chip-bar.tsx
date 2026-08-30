"use client";

// specs/007-search-filter US3: VI-002/VI-010, mirroring the reference prototype's own
// #chipBar rendering (docs/product/prototype/flowboard-prototype.html lines 417-428)
// exactly — chip text formats ('Text: "…"', 'Label: …', 'Member: …', 'Due: …') and the
// "Filters" label are taken from that source, not from spec.md's VI-010 prose, which
// mis-describes the multi-filter-chips.jpg screenshot as omitting the "Filters" label;
// the screenshot itself (rung 1) and the prototype's own source both show it unconditionally
// whenever chips.length > 0 — confirmed by opening the screenshot directly.
// Visual Compliance Loop (Phase 7): chips and "Clear all" share one filled-gray surface in
// the reference (`.chip`/`.btn` both use `--panel-2`, prototype lines 57/68) — switched
// both off a plain white/outline treatment to `bg-muted`, this app's equivalent token
// (already used for the list header's count pill in list-column.tsx).
import type { LabelSummary, MemberAvatar } from "@/lib/api/boards-client";
import { isBoardFilterActive, type DueBucket } from "@/lib/board/passes-board-filter";
import { useBoardFilter } from "@/components/board/board-filter-context";

interface FilterChipBarProps {
  boardLabels: LabelSummary[];
  members: MemberAvatar[];
}

const DUE_CHIP_LABEL: Record<Exclude<DueBucket, "">, string> = {
  overdue: "Overdue",
  week: "Next 7 days",
  none: "No date",
};

interface Chip {
  key: string;
  text: string;
}

export function FilterChipBar({ boardLabels, members }: FilterChipBarProps) {
  const { filter, clearOne, clearAll } = useBoardFilter();

  if (!isBoardFilterActive(filter)) return null;

  const chips: Chip[] = [];
  if (filter.text) {
    chips.push({ key: "text", text: `Text: "${filter.text}"` });
  }
  for (const labelId of filter.labelIds) {
    const label = boardLabels.find((l) => l.publicId === labelId);
    chips.push({ key: `label:${labelId}`, text: `Label: ${label?.name ?? labelId}` });
  }
  for (const memberId of filter.memberIds) {
    const member = members.find((m) => m.publicId === memberId);
    chips.push({ key: `member:${memberId}`, text: `Member: ${member?.displayName ?? memberId}` });
  }
  if (filter.due) {
    chips.push({ key: "due", text: `Due: ${DUE_CHIP_LABEL[filter.due]}` });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-foreground/10 bg-muted/40 px-4 py-2">
      <span className="text-xs text-muted-foreground">Filters</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-muted px-2.5 py-1 text-xs"
        >
          {chip.text}
          <button
            type="button"
            onClick={() => clearOne(chip.key as Parameters<typeof clearOne>[0])}
            aria-label={`Remove filter: ${chip.text}`}
            className="font-bold text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="rounded-md border border-foreground/15 bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80 hover:bg-foreground/10"
      >
        Clear all
      </button>
    </div>
  );
}
