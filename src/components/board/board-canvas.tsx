// VI-006: lists arranged left-to-right, each list a fixed-width column with its own
// background distinct from the canvas. Lists/cards render in the stored order the
// backend already returned (invariant 2) — this component MUST NOT re-sort them.
import type { BoardContent } from "@/lib/api/boards-client";
import { ListColumn } from "@/components/board/list-column";

interface BoardCanvasProps {
  board: BoardContent;
}

export function BoardCanvas({ board }: BoardCanvasProps) {
  return (
    <main className="flex-1 overflow-x-auto overflow-y-auto bg-muted/20 p-4">
      {board.lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">This board has no lists yet.</p>
      ) : (
        <div className="flex h-full items-start gap-4">
          {board.lists.map((list) => (
            <ListColumn key={list.publicId} list={list} />
          ))}
        </div>
      )}
    </main>
  );
}
