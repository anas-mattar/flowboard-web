// Server Components have no Request object to run through the fetch adapter
// (app/api/trpc/[trpc]/route.ts), so they call the router directly via a caller built
// from the same session resolution (lib/auth/session.ts) — same procedures, same
// backend-call path, just no network hop (frontend-trpc.md: no ad-hoc fetches).
import { appRouter } from "@/server/api/root";
import { getBackendSession } from "@/lib/auth/session";
import type { Context } from "@/server/api/trpc";

export async function createServerCaller() {
  const backendSession = await getBackendSession();

  const ctx: Context = {
    session: backendSession,
  };

  return appRouter.createCaller(ctx);
}
