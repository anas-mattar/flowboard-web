import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getToken } from "next-auth/jwt";
import { appRouter } from "@/server/api/root";
import type { Context } from "@/server/api/trpc";
import { isSecureCookie } from "@/lib/auth/secure-cookie";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async ({ req }): Promise<Context> => {
      // Reads the internal NextAuth JWT directly (bypasses the session() callback's
      // client-safe projection, research R-5) — this is the one server-side place that
      // needs the raw backend token, to attach as Authorization: Bearer downstream.
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, secureCookie: isSecureCookie });
      if (!token?.backendToken) {
        return { session: null };
      }

      return {
        session: {
          userPublicId: token.publicId,
          workspacePublicId: token.workspacePublicId,
          workspaceRole: token.workspaceRole,
          backendToken: token.backendToken,
        },
      };
    },
  });

export { handler as GET, handler as POST };
