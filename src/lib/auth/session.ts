// research R-5: the one server-side accessor for the raw internal JWT (including the
// backend token) outside a Route Handler — Server Components have no Request object, so
// this rebuilds a minimal one from next/headers' cookies() for next-auth/jwt's getToken.
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { isSecureCookie } from "@/lib/auth/secure-cookie";

export interface BackendSession {
  userPublicId: string;
  workspacePublicId: string;
  workspaceRole: string;
  backendToken: string;
}

export async function getBackendSession(): Promise<BackendSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const token = await getToken({
    req: { headers: new Headers({ cookie: cookieHeader }) },
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecureCookie,
  });

  if (!token?.backendToken) {
    return null;
  }

  return {
    userPublicId: token.publicId,
    workspacePublicId: token.workspacePublicId,
    workspaceRole: token.workspaceRole,
    backendToken: token.backendToken,
  };
}
