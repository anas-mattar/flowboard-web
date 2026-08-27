// tRPC foundation (ADR-2, specs/001-solution-scaffold/plan.md — governance repo).
// protectedProcedure added in 002-auth-workspaces: session context now exists
// (docs/rulebooks/frontend/frontend-trpc.md, BFF Status "Trigger to change"). Writes and
// user-specific reads use protectedProcedure; publicProcedure stays for safe reads
// (auth.signup — there is no session yet at signup time).
import { initTRPC, TRPCError } from "@trpc/server";

export interface TrpcSession {
  userPublicId: string;
  workspacePublicId: string;
  workspaceRole: string;
  // research R-6: identity-only backend claims — this is the bearer token attached to
  // every backend call, never the source of authorization decisions (the backend
  // re-resolves those per request via BoardAccessService).
  backendToken: string;
}

export interface Context {
  session: TrpcSession | null;
}

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { session: ctx.session } });
});
