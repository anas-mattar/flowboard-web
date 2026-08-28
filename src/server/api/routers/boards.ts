// BFF side of specs/003-board-view-readonly/contracts/board-content-api.md. Both
// procedures are protectedProcedure — every one requires a session, and the backend
// re-resolves the caller's actual board access on every call (domain invariant 5); this
// router never makes an authorization decision itself, only maps backend responses.
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { listBoardsInputSchema, getBoardContentInputSchema } from "@/lib/boards/schemas";
import { listBoards, getBoardContent } from "@/lib/api/boards-client";

function unavailable(): TRPCError {
  return new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "The FlowBoard backend is unavailable.",
  });
}

export const boardsRouter = createTRPCRouter({
  list: protectedProcedure.input(listBoardsInputSchema).query(async ({ ctx, input }) => {
    const result = await listBoards(input, ctx.session.backendToken);
    if (result.ok) {
      return result.data;
    }
    if (result.status === "validation") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cursor or limit." });
    }
    throw unavailable();
  }),

  getContent: protectedProcedure
    .input(getBoardContentInputSchema)
    .query(async ({ ctx, input }) => {
      const result = await getBoardContent(input.boardPublicId, ctx.session.backendToken);
      if (result.ok) {
        return result.data;
      }
      if (result.status === "not_found") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." });
      }
      throw unavailable();
    }),
});
