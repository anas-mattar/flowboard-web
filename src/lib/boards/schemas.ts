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
