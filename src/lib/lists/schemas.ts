// Zod input schemas for the lists tRPC router — mirrors
// specs/005-drag-drop-ordering/contracts/move-api.md.
import { z } from "zod";

export const moveListInputSchema = z.object({
  listPublicId: z.string(),
  beforeListPublicId: z.string().optional(),
});
export type MoveListInput = z.infer<typeof moveListInputSchema>;
