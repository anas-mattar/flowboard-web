// Module augmentation for next-auth v5 beta (research R-5, R-6): the session shape
// exposed to the client carries only the safe projection (no backend JWT); the internal
// JWT (read server-side only, via next-auth/jwt's getToken) carries the backend token too.
//
// Targets @auth/core/types and @auth/core/jwt directly, NOT "next-auth"/"next-auth/jwt":
// next-auth's User/Session/JWT are re-exports (`export type {...} from "@auth/core/..."`),
// and TypeScript's declaration merging only augments the module that actually declares
// the interface — augmenting the re-exporting module silently does nothing.
import type { DefaultSession } from "@auth/core/types";

interface FlowboardIdentity {
  publicId: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  workspacePublicId: string;
  workspaceName: string;
  workspaceRole: string;
}

declare module "@auth/core/types" {
  interface User extends FlowboardIdentity {
    backendToken: string;
    backendTokenExpiresAtUtc: string;
  }

  interface Session {
    user: FlowboardIdentity & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends FlowboardIdentity {
    backendToken: string;
    backendTokenExpiresAtUtc: string;
  }
}
