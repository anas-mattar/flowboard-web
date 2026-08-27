// BFF side of specs/002-auth-workspaces/contracts/board-membership-api.md. All
// procedures are protectedProcedure — every one requires a session, and the backend
// re-resolves the caller's actual board access on every call (domain invariant 5); this
// router never makes an authorization decision itself, only maps backend responses.
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { inviteMemberInputSchema } from "@/lib/board-members/schemas";
import {
  listMembers,
  inviteMember,
  revokeInvitation as revokeInvitationApi,
  removeMember as removeMemberApi,
} from "@/lib/api/board-members-client";

function unavailable(): TRPCError {
  return new TRPCError({
    code: "SERVICE_UNAVAILABLE",
    message: "The FlowBoard backend is unavailable.",
  });
}

export const boardMembersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ boardPublicId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await listMembers(input.boardPublicId, ctx.session.backendToken);
      if (result.ok) {
        return result.data;
      }
      if (result.status === "not_found") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." });
      }
      throw unavailable();
    }),

  invite: protectedProcedure.input(inviteMemberInputSchema).mutation(async ({ ctx, input }) => {
    const result = await inviteMember(
      input.boardPublicId,
      { email: input.email, role: input.role },
      ctx.session.backendToken,
    );

    if (result.ok) {
      return result;
    }
    if (result.status === "not_found") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." });
    }
    if (result.status === "forbidden") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only board admins can invite members.",
      });
    }
    if (result.status === "conflict") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This person is already a member of this board.",
      });
    }
    if (result.status === "validation") {
      const firstError = Object.values(result.fieldErrors)[0]?.[0];
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: firstError ?? "Some of the information you entered isn't valid.",
      });
    }
    throw unavailable();
  }),

  revokeInvitation: protectedProcedure
    .input(z.object({ invitationPublicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await revokeInvitationApi(input.invitationPublicId, ctx.session.backendToken);
      if (result.ok) {
        return { success: true };
      }
      if (result.status === "not_found") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      }
      if (result.status === "forbidden") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only board admins can revoke invitations.",
        });
      }
      throw unavailable();
    }),

  removeMember: protectedProcedure
    .input(z.object({ boardPublicId: z.string(), userPublicId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await removeMemberApi(
        input.boardPublicId,
        input.userPublicId,
        ctx.session.backendToken,
      );
      if (result.ok) {
        return { success: true };
      }
      if (result.status === "not_found") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      }
      if (result.status === "forbidden") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only board admins can remove members.",
        });
      }
      throw unavailable();
    }),
});
