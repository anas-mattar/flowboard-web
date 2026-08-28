// Server-only client for specs/003-board-view-readonly/contracts/board-content-api.md.
// Called only from server/api/routers/boards.ts (protectedProcedure); attaches the
// caller's backend JWT as Authorization: Bearer — the backend re-resolves the caller's
// actual board access on every call (domain invariant 5), this client never makes
// authorization decisions itself.
import type { MemberUser } from "@/lib/api/board-members-client";

export interface BoardSummary {
  publicId: string;
  name: string;
  color: string;
  starred: boolean;
  cardCount: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LabelSummary {
  publicId: string;
  name: string;
  color: string;
}

// MemberAvatar (data-model.md): same shape as board-membership-api.md's member `user`
// object — reused, not redefined.
export type MemberAvatar = MemberUser;

export interface CardSummary {
  publicId: string;
  title: string;
  dueAt: string | null;
  dueStatus: "complete" | "overdue" | "soon" | "future" | null;
  hasDescription: boolean;
  checklistDone: number | null;
  checklistTotal: number | null;
  commentCount: number;
  labels: LabelSummary[];
  members: MemberAvatar[];
}

export interface ListContent {
  publicId: string;
  name: string;
  wipLimit: number | null;
  cardCount: number;
  cards: CardSummary[];
}

export interface BoardContent {
  publicId: string;
  name: string;
  color: string;
  starred: boolean;
  lists: ListContent[];
}

const BOARDS_API_TIMEOUT_MS = 5_000;

type RawResult = { reached: true; status: number; payload: unknown } | { reached: false };

async function callBoardsApi(path: string, backendToken: string): Promise<RawResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) {
    return { reached: false };
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      headers: { Authorization: `Bearer ${backendToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(BOARDS_API_TIMEOUT_MS),
    });
  } catch {
    return { reached: false };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // No/invalid JSON body — the status code alone drives the caller's branching below.
  }

  return { reached: true, status: response.status, payload };
}

export type ListBoardsResult =
  | { ok: true; data: CursorPage<BoardSummary> }
  | { ok: false; status: "validation" }
  | { ok: false; status: "unavailable" };

export async function listBoards(
  input: { cursor?: string; limit?: number },
  backendToken: string,
): Promise<ListBoardsResult> {
  const query = new URLSearchParams();
  if (input.cursor) {
    query.set("cursor", input.cursor);
  }
  if (input.limit) {
    query.set("limit", String(input.limit));
  }
  const suffix = query.toString();

  const result = await callBoardsApi(`/v1/boards${suffix ? `?${suffix}` : ""}`, backendToken);
  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }
  if (result.status === 200) {
    return { ok: true, data: result.payload as CursorPage<BoardSummary> };
  }
  if (result.status === 400) {
    return { ok: false, status: "validation" };
  }
  return { ok: false, status: "unavailable" };
}

export type GetBoardContentResult =
  | { ok: true; data: BoardContent }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "unavailable" };

export async function getBoardContent(
  boardPublicId: string,
  backendToken: string,
): Promise<GetBoardContentResult> {
  const result = await callBoardsApi(`/v1/boards/${boardPublicId}`, backendToken);
  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }
  if (result.status === 200) {
    return { ok: true, data: result.payload as BoardContent };
  }
  if (result.status === 404) {
    return { ok: false, status: "not_found" };
  }
  return { ok: false, status: "unavailable" };
}
