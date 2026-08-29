// BFF side of specs/005-drag-drop-ordering/contracts/move-api.md. protectedProcedure —
// the backend re-resolves the caller's actual board access on every call (domain
// invariant 5); this router never makes an authorization decision itself.
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { moveListInputSchema } from "@/lib/lists/schemas";
import { moveList } from "@/lib/api/lists-client";

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

export const listsRouter = createTRPCRouter({
  move: protectedProcedure.input(moveListInputSchema).mutation(async ({ ctx, input }) => {
    const result = await moveList(input.listPublicId, input.beforeListPublicId, ctx.session.backendToken);
    if (result.ok) return { ok: true as const };
    if (result.status === "validation") throw validation(result.fieldErrors);
    if (result.status === "forbidden") throw forbidden();
    if (result.status === "not_found") throw notFound();
    throw unavailable();
  }),
});
