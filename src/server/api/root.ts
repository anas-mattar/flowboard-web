import { createTRPCRouter } from "@/server/api/trpc";
import { healthRouter } from "@/server/api/routers/health";
import { authRouter } from "@/server/api/routers/auth";
import { boardMembersRouter } from "@/server/api/routers/board-members";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  boardMembers: boardMembersRouter,
});

export type AppRouter = typeof appRouter;
