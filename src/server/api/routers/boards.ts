// BFF side of specs/003-board-view-readonly/contracts/board-content-api.md. Both
// procedures are protectedProcedure — every one requires a session, and the backend
// re-resolves the caller's actual board access on every call (domain invariant 5); this
// router never makes an authorization decision itself, only maps backend responses.
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  listBoardsInputSchema,
  getBoardContentInputSchema,
  createBoardInputSchema,
  renameBoardInputSchema,
  starBoardInputSchema,
  unstarBoardInputSchema,
  deleteBoardInputSchema,
  getRealtimeTokenInputSchema,
} from "@/lib/boards/schemas";
import {
  listBoards,
  getBoardContent,
  createBoard,
  renameBoard,
  starBoard,
  unstarBoard,
  deleteBoard,
} from "@/lib/api/boards-client";
import { getRealtimeToken } from "@/lib/api/realtime-client";

function unavailable(): TRPCError {
  return new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "The FlowBoard backend is unavailable.",
  });
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Board not found." });
}

function forbidden(): TRPCError {
  return new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to do this." });
}

function validation(fieldErrors: Record<string, string[]>): TRPCError {
  const message = Object.values(fieldErrors)[0]?.[0] ?? "Validation failed.";
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function conflict(): TRPCError {
  return new TRPCError({ code: "CONFLICT", message: "This board was changed by someone else." });
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

  create: protectedProcedure.input(createBoardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await createBoard(input.name, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    throw unavailable();
  }),

  rename: protectedProcedure.input(renameBoardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await renameBoard(input.boardPublicId, input.name, input.ifMatch, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    if (result.status === "conflict") throw conflict();
    throw unavailable();
  }),

  star: protectedProcedure.input(starBoardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await starBoard(input.boardPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  unstar: protectedProcedure.input(unstarBoardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await unstarBoard(input.boardPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  delete: protectedProcedure.input(deleteBoardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await deleteBoard(input.boardPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  // contracts/realtime-api.md — the one tRPC procedure the browser calls for realtime; the
  // resulting token is then used directly against the SignalR hub (frontend-rules.md's
  // sanctioned exception), never routed through the BFF again.
  getRealtimeToken: protectedProcedure.input(getRealtimeTokenInputSchema).query(async ({ ctx, input }) => {
    const result = await getRealtimeToken(input.boardPublicId, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),
});
