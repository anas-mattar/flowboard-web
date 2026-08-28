// T053's seam completed by 003: this page now fetches the board's real content
// (boards.getContent) and renders the read-only canvas, plus the existing membership
// list (2's boardMembers.list) for the top bar's avatar stack (R-6). The (app) layout
// already redirects unauthenticated visitors to /login; this page's own guard is the
// NOT_FOUND branch below, unchanged from 002 (FR-013 — a board's existence is not
// confirmed to a non-member).
import { TRPCError } from "@trpc/server";
import { createServerCaller } from "@/server/api/caller";
import { TopBar } from "@/components/layout/top-bar";
import { BoardCanvas } from "@/components/board/board-canvas";

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
    <>
      <TopBar
        board={{
          name: content.name,
          members: membership.members.map((member) => member.user),
        }}
      />
      <BoardCanvas board={content} />
    </>
  );
}
