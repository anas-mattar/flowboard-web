// Server-only client for contracts/realtime-api.md's POST
// /v1/boards/{boardPublicId}/realtime-token. Called only from
// server/api/routers/boards.ts (protectedProcedure); attaches the caller's backend JWT as
// Authorization: Bearer — the backend re-resolves the caller's actual board access on
// every call (domain invariant 5) before minting the short-lived realtime token. This is
// the only backend call behind `boards.getRealtimeToken`; the resulting token is then used
// directly against the SignalR hub from the browser (frontend-rules.md's one sanctioned
// exception to the tRPC-only Data Flow rule).
const REALTIME_TOKEN_API_TIMEOUT_MS = 5_000;

export interface RealtimeToken {
  token: string;
  expiresAt: string;
}

export type GetRealtimeTokenResult =
  | { ok: true; data: RealtimeToken }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "unavailable" };

export async function getRealtimeToken(
  boardPublicId: string,
  backendToken: string,
): Promise<GetRealtimeTokenResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) {
    return { ok: false, status: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetch(new URL(`/v1/boards/${boardPublicId}/realtime-token`, baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${backendToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REALTIME_TOKEN_API_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: "unavailable" };
  }

  if (response.status === 200) {
    return { ok: true, data: (await response.json()) as RealtimeToken };
  }
  if (response.status === 404) {
    return { ok: false, status: "not_found" };
  }
  return { ok: false, status: "unavailable" };
}
