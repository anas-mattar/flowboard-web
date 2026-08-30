import { UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";
import { BoardTitleBar } from "@/components/layout/board-title-bar";
import { BoardSearchInput } from "@/components/layout/board-search-input";
import { FilterPopover } from "@/components/board/filter-popover";
import { RealtimeStatusIndicator } from "@/components/layout/realtime-status-indicator";
import { auth } from "@/lib/auth/auth-config";
import type { MemberAvatar, BoardContent } from "@/lib/api/boards-client";

export interface TopBarBoardSummary {
  content: BoardContent;
  members: MemberAvatar[];
}

interface TopBarProps {
  board?: TopBarBoardSummary;
}

// US2/R-6: workspace identity when no board is open (unchanged since 001/002); once a
// board is open, VI-004/VI-005's full layout takes over — title, star, search, filter,
// avatar stack, invite, theme toggle. Title rename and star are now live
// (specs/006-board-list-management, BoardTitleBar); search and the label/member/due-date
// Filter popover are now live (specs/007-search-filter US1/US2, BoardSearchInput/
// FilterPopover). The remaining decorative control (Invite) stays visible but inert
// (FR-007/Assumptions) — `disabled` communicates that to assistive tech rather than
// presenting a control that silently does nothing when activated. The sidebar toggle
// (US3, T036) is functional. The connection-status indicator (specs/008-realtime-sync
// US3, T025/T026, FR-009) reads the board's one live hub connection via
// board-realtime-context.tsx, which page.tsx wraps around this component and BoardCanvas
// together (siblings, ADR-30).
export async function TopBar({ board }: TopBarProps) {
  const session = await auth();

  if (board) {
    return (
      <header className="flex items-center justify-between gap-4 border-b border-foreground/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarToggleButton />
          <BoardTitleBar boardPublicId={board.content.publicId} initialBoard={board.content} />
        </div>

        <div className="flex items-center gap-2">
          <RealtimeStatusIndicator />
          <BoardSearchInput />
          <FilterPopover boardPublicId={board.content.publicId} members={board.members} />
          {board.members.length > 0 && (
            <div className="flex -space-x-1.5">
              {board.members.map((member) => (
                <span
                  key={member.publicId}
                  title={member.displayName}
                  className="flex size-6 items-center justify-center rounded-full border-2 border-background text-[0.65rem] font-medium text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.initials}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-md border border-foreground/20 px-2.5 py-1.5 text-sm text-foreground/70 disabled:opacity-60"
          >
            <UserPlus className="size-3.5" />
            Invite
          </button>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-3">
      <div className="flex items-center gap-3">
        <SidebarToggleButton />
        <span className="text-lg font-semibold tracking-tight">FlowBoard</span>
        {session?.user && (
          <span className="text-sm text-muted-foreground">
            {session.user.workspaceName} · {session.user.workspaceRole}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {session?.user && <SignOutButton />}
      </div>
    </header>
  );
}
