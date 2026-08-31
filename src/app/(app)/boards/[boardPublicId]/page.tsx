// This server component still does the first fetch (auth gate, fast first paint,
// unchanged from 003) and hands off to the client-driven BoardCanvas (004's ADR-19),
// plus the existing membership list (002's boardMembers.list) for the top bar's avatar
// stack (R-6). The (app) layout already redirects unauthenticated visitors to /login;
// this page's own guard is the NOT_FOUND branch below, unchanged from 002 (FR-013 — a
// board's existence is not confirmed to a non-member).
import { TRPCError } from "@trpc/server";
import { createServerCaller } from "@/server/api/caller";
import { TopBar } from "@/components/layout/top-bar";
import { BoardCanvas } from "@/components/board/board-canvas";
import { BoardFilterProvider } from "@/components/board/board-filter-context";
import { BoardRealtimeProvider } from "@/components/board/board-realtime-context";

interface BoardPageProps {
  params: Promise<{ boardPublicId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardPublicId } = await params;
  const caller = await createServerCaller();

  let content: Awaited<ReturnType<typeof caller.boards.getContent>>;
  let membership: Awaited<ReturnType<typeof caller.boardMembers.list>>;
  try {
    [content, membership] = await Promise.all([
      caller.boards.getContent({ boardPublicId }),
      caller.boardMembers.list({ boardPublicId }),
    ]);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return (
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have access to this board, or it doesn&apos;t exist.
          </p>
        </main>
      );
    }
    throw error;
  }

  return (
    // specs/007-search-filter ADR-30: TopBar (search box, Filter trigger) and BoardCanvas
    // (chip bar, actual filtering) are siblings here, not parent/child — the provider
    // wraps both. Keyed by boardPublicId so switching boards remounts it and resets every
    // filter/search selection (FR-009) instead of requiring a manual reset effect.
    // specs/008-realtime-sync US3 (T026): BoardRealtimeProvider owns the one hub
    // connection for this board — nested inside so it remounts (and reconnects) on the
    // same boardPublicId change — and shares its status with both TopBar's indicator and
    // BoardCanvas via board-realtime-context.tsx.
    <BoardFilterProvider key={boardPublicId}>
      <BoardRealtimeProvider boardPublicId={boardPublicId}>
        <TopBar
          board={{
            content,
            members: membership.members.map((member) => member.user),
          }}
        />
        <BoardCanvas boardPublicId={boardPublicId} initialBoard={content} />
      </BoardRealtimeProvider>
    </BoardFilterProvider>
  );
}
