// Zod input schemas for the cards tRPC router — mirrors
// specs/004-card-crud/contracts/card-crud-api.md.
import { z } from "zod";

export const createCardInputSchema = z.object({
  listPublicId: z.string(),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
});
export type CreateCardInput = z.infer<typeof createCardInputSchema>;

export const cardComposerFormSchema = createCardInputSchema.omit({ listPublicId: true });
export type CardComposerFormValues = z.infer<typeof cardComposerFormSchema>;

export const getCardDetailInputSchema = z.object({ cardPublicId: z.string() });
export type GetCardDetailInput = z.infer<typeof getCardDetailInputSchema>;

export const updateCardInputSchema = z.object({
  cardPublicId: z.string(),
  ifMatch: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20_000).nullable().optional(),
  dueAt: z.string().nullable().optional(),
  dueComplete: z.boolean().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardInputSchema>;

export const assignLabelInputSchema = z.object({ cardPublicId: z.string(), labelPublicId: z.string() });
export const removeLabelInputSchema = assignLabelInputSchema;

export const assignMemberInputSchema = z.object({ cardPublicId: z.string(), userPublicId: z.string() });
export const removeMemberInputSchema = assignMemberInputSchema;

export const addChecklistItemInputSchema = z.object({
  cardPublicId: z.string(),
  text: z.string().min(1, "Text is required").max(500, "Text must be 500 characters or fewer"),
});
export type AddChecklistItemInput = z.infer<typeof addChecklistItemInputSchema>;

export const toggleChecklistItemInputSchema = z.object({
  checklistItemPublicId: z.string(),
  done: z.boolean(),
});

export const deleteChecklistItemInputSchema = z.object({ checklistItemPublicId: z.string() });

export const addCommentInputSchema = z.object({
  cardPublicId: z.string(),
  body: z.string().min(1, "Comment can't be empty").max(2_000, "Comment must be 2000 characters or fewer"),
});
export type AddCommentInput = z.infer<typeof addCommentInputSchema>;

export const commentFormSchema = addCommentInputSchema.omit({ cardPublicId: true });
export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const getActivityInputSchema = z.object({
  cardPublicId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const copyCardInputSchema = z.object({ cardPublicId: z.string() });
export const deleteCardInputSchema = z.object({ cardPublicId: z.string() });

// specs/005-drag-drop-ordering/contracts/move-api.md.
export const moveCardInputSchema = z.object({
  cardPublicId: z.string(),
  listPublicId: z.string(),
  beforeCardPublicId: z.string().optional(),
});
export type MoveCardInput = z.infer<typeof moveCardInputSchema>;
