// T053: the seam 003 extends into the full board canvas — this stays a minimal member
// list host for now. Server component: redirects unauthenticated visitors to /login
// (frontend-state-auth-style.md), shows an access-denied state (not the panel) when the
// backend returns 404 for a non-member (FR-013 — a board's existence is not confirmed
// to a non-member), otherwise renders BoardMembersPanel.
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth/auth-config";
import { createServerCaller } from "@/server/api/caller";
import { BoardMembersPanel } from "@/components/board-members/board-members-panel";

interface BoardPageProps {
  params: Promise<{ boardPublicId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardPublicId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const caller = await createServerCaller();
  try {
    await caller.boardMembers.list({ boardPublicId });
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
    <main className="mx-auto max-w-2xl p-8">
      <BoardMembersPanel boardPublicId={boardPublicId} />
    </main>
  );
}
