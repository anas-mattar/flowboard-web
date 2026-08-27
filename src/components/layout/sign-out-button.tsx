"use client";

// US5: sign-out ends the session (spec FR-005) — the frontend discarding its NextAuth
// session, since the backend JWT is stateless with no server-side revocation (ADR-7).
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </Button>
  );
}
