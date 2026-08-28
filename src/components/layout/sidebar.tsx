"use client";

// VI-001/VI-002/VI-003: brand block, boards list (color swatch/name/card count,
// currently-open-board highlight), user footer. Boards data comes from
// trpc.boards.list (frontend-rules.md Data Flow — client data access uses trpc hooks);
// the active board is read from the URL (usePathname), not lifted state, since this
// component has no other reason to know which page is rendering it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";

// VI-003 shows "Workspace admin", not the raw PascalCase role value the backend returns.
function humanizeRole(role: string): string {
  const spaced = role.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0) + spaced.slice(1).toLowerCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const boardsQuery = trpc.boards.list.useQuery({});
  const { collapsed } = useSidebar();

  const activeBoardPublicId = pathname?.match(/^\/boards\/([^/]+)/)?.[1];

  // US3: the sidebar disappears entirely (not just visually hidden) so the canvas
  // reclaims its width immediately, and its links/controls leave the tab order.
  if (collapsed) {
    return null;
  }

  return (
    // VI-001: the sidebar is permanently dark chrome, independent of the app-wide
    // light/dark toggle (unlike BoardCanvas/ListColumn/CardFront, which do follow it) —
    // the literal `dark` class scopes the dark-theme token values to this subtree only.
    <aside className="dark flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          F
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">FlowBoard</p>
          {session?.user && (
            <p className="truncate text-[0.65rem] font-medium tracking-wide text-sidebar-foreground/60 uppercase">
              {session.user.workspaceName}
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Boards">
        <p className="px-2 pt-2 pb-2 text-[0.65rem] font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
          Boards
        </p>

        {boardsQuery.isLoading && (
          <p className="px-2 py-2 text-sm text-sidebar-foreground/60">Loading boards…</p>
        )}

        {boardsQuery.isError && (
          <p className="px-2 py-2 text-sm text-destructive">Couldn&apos;t load boards.</p>
        )}

        {boardsQuery.data && boardsQuery.data.items.length === 0 && (
          <p className="px-2 py-2 text-sm text-sidebar-foreground/60">No boards yet.</p>
        )}

        {boardsQuery.data && boardsQuery.data.items.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {boardsQuery.data.items.map((board) => {
              const isActive = board.publicId === activeBoardPublicId;
              return (
                <li key={board.publicId}>
                  <Link
                    href={`/boards/${board.publicId}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                      isActive
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                    )}
                  >
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="flex-1 truncate">{board.name}</span>
                    <span className="text-xs text-sidebar-foreground/50">{board.cardCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {session?.user && (
        <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: session.user.avatarColor }}
          >
            {session.user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.user.displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {humanizeRole(session.user.workspaceRole)}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
