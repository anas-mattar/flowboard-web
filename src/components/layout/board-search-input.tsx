"use client";

// specs/007-search-filter US1/FR-001/FR-010: TopBar stays a server component (R-6), so
// only this interactive piece is a client island — same shape as sidebar-toggle-button.tsx.
// FR-010/X-03: `/` or `F` focuses this input from anywhere on the board, unless the
// member is already typing into another field.
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useBoardFilter } from "@/components/board/board-filter-context";

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function BoardSearchInput() {
  const { filter, setText } = useBoardFilter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingInField(event.target)) return;
      if (event.key === "/" || event.key === "f" || event.key === "F") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative hidden sm:block">
      <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={filter.text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search cards…"
        className="h-8 w-40 rounded-md border border-input bg-transparent pl-7 text-sm placeholder:text-muted-foreground md:w-56"
      />
    </div>
  );
}
