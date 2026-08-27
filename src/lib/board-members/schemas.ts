// Zod schema for the invite form (Rule F8b) — mirrors
// contracts/board-membership-api.md's POST /v1/boards/{boardPublicId}/invitations.
import { z } from "zod";

export const boardRoleSchema = z.enum(["BoardAdmin", "BoardMember", "Observer"]);

export const inviteMemberInputSchema = z.object({
  boardPublicId: z.string(),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  role: boardRoleSchema,
});

export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

// The invite form itself only collects email + role — boardPublicId comes from the page.
export const inviteFormSchema = inviteMemberInputSchema.omit({ boardPublicId: true });

export type InviteFormValues = z.infer<typeof inviteFormSchema>;
