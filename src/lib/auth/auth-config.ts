// plan.md ADR-8; research R-4/R-5/R-6. Credentials provider calling the backend login
// endpoint server-side (authorize() runs in the Node process, never in the browser);
// JWT session strategy, 14-day maxAge matching the backend token lifetime (ADR-7).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { logIn } from "@/lib/api/auth-client";

const FOURTEEN_DAYS_SECONDS = 14 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: FOURTEEN_DAYS_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const result = await logIn({ email, password });
        if (!result.ok) {
          return null;
        }

        const { user, workspace, token, expiresAtUtc } = result.data;
        return {
          id: user.publicId,
          email: user.email,
          publicId: user.publicId,
          displayName: user.displayName,
          initials: user.initials,
          avatarColor: user.avatarColor,
          workspacePublicId: workspace.publicId,
          workspaceName: workspace.name,
          workspaceRole: workspace.role,
          backendToken: token,
          backendTokenExpiresAtUtc: expiresAtUtc,
        };
      },
    }),
  ],
  callbacks: {
    // research R-5: the full backend JWT lives only in NextAuth's own encrypted
    // (JWE) internal token — never in the object returned to the client below.
    jwt({ token, user }) {
      if (user) {
        token.publicId = user.publicId;
        token.displayName = user.displayName;
        token.initials = user.initials;
        token.avatarColor = user.avatarColor;
        token.workspacePublicId = user.workspacePublicId;
        token.workspaceName = user.workspaceName;
        token.workspaceRole = user.workspaceRole;
        token.backendToken = user.backendToken;
        token.backendTokenExpiresAtUtc = user.backendTokenExpiresAtUtc;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        publicId: token.publicId,
        displayName: token.displayName,
        initials: token.initials,
        avatarColor: token.avatarColor,
        workspacePublicId: token.workspacePublicId,
        workspaceName: token.workspaceName,
        workspaceRole: token.workspaceRole,
      };
      return session;
    },
  },
});
