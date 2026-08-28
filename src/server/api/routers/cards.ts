// BFF side of specs/004-card-crud/contracts/card-crud-api.md. Every procedure is
// protectedProcedure — the backend re-resolves the caller's actual board/card access on
// every call (domain invariant 5); this router never makes an authorization decision
// itself, only maps backend responses (including the Observer-vs-Member/Admin matrix's
// 403s) into typed tRPC errors.
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  createCardInputSchema,
  getCardDetailInputSchema,
  updateCardInputSchema,
  assignLabelInputSchema,
  removeLabelInputSchema,
  assignMemberInputSchema,
  removeMemberInputSchema,
  addChecklistItemInputSchema,
  toggleChecklistItemInputSchema,
  deleteChecklistItemInputSchema,
  addCommentInputSchema,
  getActivityInputSchema,
  copyCardInputSchema,
  deleteCardInputSchema,
} from "@/lib/cards/schemas";
import {
  createCard,
  getCardDetail,
  updateCard,
  assignLabel,
  removeLabel,
  assignMember,
  removeMember,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addComment,
  getActivity,
  copyCard,
  deleteCard,
} from "@/lib/api/cards-client";

function unavailable(): TRPCError {
  return new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The FlowBoard backend is unavailable." });
}

function notFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Not found." });
}

function forbidden(): TRPCError {
  return new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have permission to do this.",
  });
}

function validation(fieldErrors: Record<string, string[]>): TRPCError {
  const message = Object.values(fieldErrors)[0]?.[0] ?? "Validation failed.";
  return new TRPCError({ code: "BAD_REQUEST", message });
}

export const cardsRouter = createTRPCRouter({
  create: protectedProcedure.input(createCardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await createCard(input.listPublicId, input.title, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  getDetail: protectedProcedure.input(getCardDetailInputSchema).query(async ({ ctx, input }) => {
    const result = await getCardDetail(input.cardPublicId, ctx.session.backendToken);
    if (result.ok) return { card: result.data, etag: result.etag };
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  update: protectedProcedure.input(updateCardInputSchema).mutation(async ({ ctx, input }) => {
    const { cardPublicId, ifMatch, ...fields } = input;
    const result = await updateCard(cardPublicId, ifMatch, fields, ctx.session.backendToken);
    if (result.ok) return { card: result.data, etag: result.etag };
    if (result.status === "conflict") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This card was changed by someone else.",
      });
    }
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  assignLabel: protectedProcedure.input(assignLabelInputSchema).mutation(async ({ ctx, input }) => {
    const result = await assignLabel(input.cardPublicId, input.labelPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  removeLabel: protectedProcedure.input(removeLabelInputSchema).mutation(async ({ ctx, input }) => {
    const result = await removeLabel(input.cardPublicId, input.labelPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  assignMember: protectedProcedure.input(assignMemberInputSchema).mutation(async ({ ctx, input }) => {
    const result = await assignMember(input.cardPublicId, input.userPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  removeMember: protectedProcedure.input(removeMemberInputSchema).mutation(async ({ ctx, input }) => {
    const result = await removeMember(input.cardPublicId, input.userPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  addChecklistItem: protectedProcedure
    .input(addChecklistItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await addChecklistItem(input.cardPublicId, input.text, ctx.session.backendToken);
      if (result.ok) return result.data;
      if (result.status === "validation") throw validation(result.fieldErrors);
      if (result.status === "forbidden") throw forbidden();
      if (result.status === "not_found") throw notFound();
      throw unavailable();
    }),

  toggleChecklistItem: protectedProcedure
    .input(toggleChecklistItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await toggleChecklistItem(
        input.checklistItemPublicId,
        input.done,
        ctx.session.backendToken,
      );
      if (result.ok) return result.data;
      if (result.status === "forbidden") throw forbidden();
      if (result.status === "not_found") throw notFound();
      throw unavailable();
    }),

  deleteChecklistItem: protectedProcedure
    .input(deleteChecklistItemInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await deleteChecklistItem(input.checklistItemPublicId, ctx.session.backendToken);
      if (result.ok) return { ok: true as const };
      if (result.status === "forbidden") throw forbidden();
      if (result.status === "not_found") throw notFound();
      throw unavailable();
    }),

  addComment: protectedProcedure.input(addCommentInputSchema).mutation(async ({ ctx, input }) => {
    const result = await addComment(input.cardPublicId, input.body, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  getActivity: protectedProcedure.input(getActivityInputSchema).query(async ({ ctx, input }) => {
    const result = await getActivity(
      input.cardPublicId,
      { cursor: input.cursor, limit: input.limit },
      ctx.session.backendToken,
    );
    if (result.ok) return result.data;
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  copy: protectedProcedure.input(copyCardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await copyCard(input.cardPublicId, ctx.session.backendToken);
    if (result.ok) return result.data;
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),

  delete: protectedProcedure.input(deleteCardInputSchema).mutation(async ({ ctx, input }) => {
    const result = await deleteCard(input.cardPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),
});
