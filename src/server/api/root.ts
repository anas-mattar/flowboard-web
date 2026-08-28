import { createTRPCRouter } from "@/server/api/trpc";
import { healthRouter } from "@/server/api/routers/health";
import { authRouter } from "@/server/api/routers/auth";
import { boardMembersRouter } from "@/server/api/routers/board-members";
import { boardsRouter } from "@/server/api/routers/boards";
import { cardsRouter } from "@/server/api/routers/cards";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  boardMembers: boardMembersRouter,
  boards: boardsRouter,
  cards: cardsRouter,
});

export type AppRouter = typeof appRouter;
