// BFF side of specs/002-auth-workspaces/contracts/auth-api.md. Signup only — login is
// NextAuth's Credentials provider (lib/auth/auth-config.ts), which calls the backend
// directly from authorize(); a signup mutation has no session yet to protect it with,
// so it stays publicProcedure (frontend-trpc.md BFF Status).
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { signupInputSchema } from "@/lib/auth/schemas";
import { signUp } from "@/lib/api/auth-client";

export const authRouter = createTRPCRouter({
  signup: publicProcedure.input(signupInputSchema).mutation(async ({ input }) => {
    const result = await signUp(input);

    if (result.ok) {
      // Deliberately not returning the backend token/workspace here — the caller
      // establishes the actual session via next-auth's signIn() right after this
      // succeeds, which re-authenticates through the same Credentials authorize().
      return { email: result.data.user.email };
    }

    if (result.status === "conflict") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists.",
      });
    }

    if (result.status === "validation") {
      const firstError = Object.values(result.fieldErrors)[0]?.[0];
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: firstError ?? "Some of the information you entered isn't valid.",
      });
    }

    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "The FlowBoard backend is unavailable.",
    });
  }),
});
