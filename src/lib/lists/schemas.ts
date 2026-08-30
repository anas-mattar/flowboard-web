// Zod input schemas for the lists tRPC router — mirrors
// specs/005-drag-drop-ordering/contracts/move-api.md.
import { z } from "zod";

export const moveListInputSchema = z.object({
  listPublicId: z.string(),
  beforeListPublicId: z.string().optional(),
});
export type MoveListInput = z.infer<typeof moveListInputSchema>;

// specs/006-board-list-management/contracts/board-list-management-api.md.
export const createListInputSchema = z.object({
  boardPublicId: z.string(),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
});
export type CreateListInput = z.infer<typeof createListInputSchema>;

export const createListFormSchema = createListInputSchema.omit({ boardPublicId: true });
export type CreateListFormValues = z.infer<typeof createListFormSchema>;

// US4 + US6 share this one schema — at least one of name/wipLimit is required.
export const updateListInputSchema = z
  .object({
    listPublicId: z.string(),
    ifMatch: z.string(),
    name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer").optional(),
    wipLimit: z.number().int().min(0, "wipLimit must not be negative").nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.wipLimit !== undefined, {
    message: "At least one of name or wipLimit must be supplied.",
  });
export type UpdateListInput = z.infer<typeof updateListInputSchema>;

export const archiveListCardsInputSchema = z.object({ listPublicId: z.string() });
export const deleteListInputSchema = z.object({ listPublicId: z.string() });
export const sortListByDueDateInputSchema = z.object({ listPublicId: z.string() });
