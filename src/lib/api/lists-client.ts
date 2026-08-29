// Server-only client for specs/005-drag-drop-ordering/contracts/move-api.md. Called only
// from server/api/routers/lists.ts (protectedProcedure); attaches the caller's backend JWT
// as Authorization: Bearer — the backend re-resolves the caller's actual board access on
// every call (domain invariant 5), this client never makes authorization decisions itself.
const LISTS_API_TIMEOUT_MS = 5_000;

type RawResult =
  | { reached: true; status: number; payload: unknown }
  | { reached: false };

async function callListsApi(
  path: string,
  backendToken: string,
  init?: { method?: string; body?: unknown },
): Promise<RawResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) {
    return { reached: false };
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${backendToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(LISTS_API_TIMEOUT_MS),
    });
  } catch {
    return { reached: false };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 204 No Content has no body — status code alone drives branching.
  }

  return { reached: true, status: response.status, payload };
}

export type MoveListResult =
  | { ok: true }
  | { ok: false; status: "validation"; fieldErrors: Record<string, string[]> }
  | { ok: false; status: "forbidden" }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "unavailable" };

export async function moveList(
  listPublicId: string,
  beforeListPublicId: string | undefined,
  backendToken: string,
): Promise<MoveListResult> {
  const result = await callListsApi(`/v1/lists/${listPublicId}/move`, backendToken, {
    method: "POST",
    body: { beforeListPublicId: beforeListPublicId ?? null },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 400) {
    const problem = result.payload as { errors?: Record<string, string[]> } | null;
    return { ok: false, status: "validation", fieldErrors: problem?.errors ?? {} };
  }
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}
