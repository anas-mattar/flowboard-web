// Zod input schemas for the boards tRPC router — mirrors
// contracts/board-content-api.md's GET /v1/boards and GET /v1/boards/{boardPublicId}.
import { z } from "zod";

export const listBoardsInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type ListBoardsInput = z.infer<typeof listBoardsInputSchema>;

export const getBoardContentInputSchema = z.object({
  boardPublicId: z.string(),
});

export type GetBoardContentInput = z.infer<typeof getBoardContentInputSchema>;

// specs/006-board-list-management/contracts/board-list-management-api.md.
export const createBoardInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
});
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

export const createBoardFormSchema = createBoardInputSchema;
export type CreateBoardFormValues = z.infer<typeof createBoardFormSchema>;

export const renameBoardInputSchema = z.object({
  boardPublicId: z.string(),
  ifMatch: z.string(),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
});
export type RenameBoardInput = z.infer<typeof renameBoardInputSchema>;

export const starBoardInputSchema = z.object({ boardPublicId: z.string() });
export const unstarBoardInputSchema = z.object({ boardPublicId: z.string() });
export const deleteBoardInputSchema = z.object({ boardPublicId: z.string() });
