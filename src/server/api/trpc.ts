// tRPC foundation (ADR-2, specs/001-solution-scaffold/plan.md — governance repo).
// publicProcedure only until feature 002 lands session context; when it does, define
// protectedProcedure here and migrate writes/user-specific reads to it
// (docs/rulebooks/frontend/frontend-trpc.md, BFF Status).
import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
