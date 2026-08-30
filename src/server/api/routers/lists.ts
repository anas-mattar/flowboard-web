// BFF side of specs/005-drag-drop-ordering/contracts/move-api.md. protectedProcedure —
// the backend re-resolves the caller's actual board access on every call (domain
// invariant 5); this router never makes an authorization decision itself.
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  moveListInputSchema,
  createListInputSchema,
  updateListInputSchema,
  archiveListCardsInputSchema,
  deleteListInputSchema,
  sortListByDueDateInputSchema,
} from "@/lib/lists/schemas";
import {
  moveList,
  createList,
  updateList,
  archiveListCards,
  deleteList,
  sortListByDueDate,
} from "@/lib/api/lists-client";

function unavailable(): TRPCError {
  return new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The FlowBoard backend is unavailable." });
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Not found." });
}

function forbidden(): TRPCError {
  return new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to do this." });
}

function validation(fieldErrors: Record<string, string[]>): TRPCError {
  const message = Object.values(fieldErrors)[0]?.[0] ?? "Validation failed.";
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function conflict(): TRPCError {
  return new TRPCError({ code: "CONFLICT", message: "This list was changed by someone else." });
}

export const listsRouter = createTRPCRouter({
  move: protectedProcedure.input(moveListInputSchema).mutation(async ({ ctx, input }) => {
    const result = await moveList(input.listPublicId, input.beforeListPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  create: protectedProcedure.input(createListInputSchema).mutation(async ({ ctx, input }) => {
    const result = await createList(input.boardPublicId, input.name, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  update: protectedProcedure.input(updateListInputSchema).mutation(async ({ ctx, input }) => {
    const result = await updateList(
      input.listPublicId,
      { name: input.name, wipLimit: input.wipLimit },
      input.ifMatch,
      ctx.session.backendToken,
    );
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    if (result.status === "conflict") throw conflict();
    throw unavailable();
  }),

  archiveCards: protectedProcedure.input(archiveListCardsInputSchema).mutation(async ({ ctx, input }) => {
    const result = await archiveListCards(input.listPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  delete: protectedProcedure.input(deleteListInputSchema).mutation(async ({ ctx, input }) => {
    const result = await deleteList(input.listPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  sort: protectedProcedure.input(sortListByDueDateInputSchema).mutation(async ({ ctx, input }) => {
    const result = await sortListByDueDate(input.listPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),
});
