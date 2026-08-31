// Server-only client for specs/004-card-crud/contracts/card-crud-api.md. Called only from
// server/api/routers/cards.ts (protectedProcedure); attaches the caller's backend JWT as
// Authorization: Bearer — the backend re-resolves the caller's actual board access on
// every call (domain invariant 5), this client never makes authorization decisions itself.
import type { CardSummary, LabelSummary, MemberAvatar } from "@/lib/api/boards-client";

export interface ChecklistItemDetail {
  publicId: string;
  text: string;
  done: boolean;
}

// specs/009-card-attachments/contracts/attachments-api.md's card-detail-payload section.
export interface AttachmentDetail {
  publicId: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: MemberAvatar;
  createdAt: string;
}

export interface CardDetail {
  publicId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  dueComplete: boolean;
  dueStatus: "complete" | "overdue" | "soon" | "future" | null;
  listPublicId: string;
  listName: string;
  boardPublicId: string;
  boardName: string;
  labels: LabelSummary[];
  members: MemberAvatar[];
  checklistItems: ChecklistItemDetail[];
  attachments: AttachmentDetail[];
}

export interface ActivityEntry {
  type: string;
  payload: Record<string, unknown>;
  actorDisplayName: string;
  actorInitials: string;
  actorAvatarColor: string;
  createdAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

const CARDS_API_TIMEOUT_MS = 5_000;

type RawResult =
  | { reached: true; status: number; payload: unknown; headers: Headers }
  | { reached: false };

async function callCardsApi(
  path: string,
  backendToken: string,
  init?: { method?: string; body?: unknown; ifMatch?: string },
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
        ...(init?.ifMatch ? { "If-Match": init.ifMatch } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(CARDS_API_TIMEOUT_MS),
    });
  } catch {
    return { reached: false };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 204 No Content and similar have no body — status code alone drives branching.
  }

  return { reached: true, status: response.status, payload, headers: response.headers };
}

type NotFoundOrUnavailable = { ok: false; status: "not_found" } | { ok: false; status: "unavailable" };
type Forbidden = { ok: false; status: "forbidden" };
type ValidationFailure = { ok: false; status: "validation"; fieldErrors: Record<string, string[]> };

function validationFailure(payload: unknown): ValidationFailure {
  const problem = payload as { errors?: Record<string, string[]> } | null;
  return { ok: false, status: "validation", fieldErrors: problem?.errors ?? {} };
}

export type CreateCardResult =
  | { ok: true; data: CardSummary }
  | ValidationFailure
  | NotFoundOrUnavailable
  | Forbidden;

export async function createCard(
  listPublicId: string,
  title: string,
  backendToken: string,
): Promise<CreateCardResult> {
  const result = await callCardsApi(`/v1/lists/${listPublicId}/cards`, backendToken, {
    method: "POST",
    body: { title },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 201) return { ok: true, data: result.payload as CardSummary };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type GetCardDetailResult =
  | { ok: true; data: CardDetail; etag: string }
  | NotFoundOrUnavailable;

export async function getCardDetail(
  cardPublicId: string,
  backendToken: string,
): Promise<GetCardDetailResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}`, backendToken);
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 200) {
    return { ok: true, data: result.payload as CardDetail, etag: result.headers.get("etag") ?? "" };
  }
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export interface UpdateCardFields {
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  dueComplete?: boolean;
}

export type UpdateCardResult =
  | { ok: true; data: CardDetail; etag: string }
  | { ok: false; status: "conflict" }
  | ValidationFailure
  | NotFoundOrUnavailable
  | Forbidden;

export async function updateCard(
  cardPublicId: string,
  ifMatch: string,
  fields: UpdateCardFields,
  backendToken: string,
): Promise<UpdateCardResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}`, backendToken, {
    method: "PATCH",
    body: fields,
    ifMatch,
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 200) {
    return { ok: true, data: result.payload as CardDetail, etag: result.headers.get("etag") ?? "" };
  }
  if (result.status === 409) return { ok: false, status: "conflict" };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type SimpleMutationResult = { ok: true } | NotFoundOrUnavailable | Forbidden | ValidationFailure;

export async function assignLabel(
  cardPublicId: string,
  labelPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/labels`, backendToken, {
    method: "POST",
    body: { labelPublicId },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export async function removeLabel(
  cardPublicId: string,
  labelPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/labels/${labelPublicId}`, backendToken, {
    method: "DELETE",
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export async function assignMember(
  cardPublicId: string,
  userPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/members`, backendToken, {
    method: "POST",
    body: { userPublicId },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export async function removeMember(
  cardPublicId: string,
  userPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/members/${userPublicId}`, backendToken, {
    method: "DELETE",
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type AddChecklistItemResult =
  | { ok: true; data: ChecklistItemDetail }
  | ValidationFailure
  | NotFoundOrUnavailable
  | Forbidden;

export async function addChecklistItem(
  cardPublicId: string,
  text: string,
  backendToken: string,
): Promise<AddChecklistItemResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/checklist-items`, backendToken, {
    method: "POST",
    body: { text },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 201) return { ok: true, data: result.payload as ChecklistItemDetail };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type ToggleChecklistItemResult =
  | { ok: true; data: ChecklistItemDetail }
  | NotFoundOrUnavailable
  | Forbidden;

export async function toggleChecklistItem(
  checklistItemPublicId: string,
  done: boolean,
  backendToken: string,
): Promise<ToggleChecklistItemResult> {
  const result = await callCardsApi(`/v1/checklist-items/${checklistItemPublicId}`, backendToken, {
    method: "PATCH",
    body: { done },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 200) return { ok: true, data: result.payload as ChecklistItemDetail };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export async function deleteChecklistItem(
  checklistItemPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/checklist-items/${checklistItemPublicId}`, backendToken, {
    method: "DELETE",
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type AddCommentResult =
  | { ok: true; data: ActivityEntry }
  | ValidationFailure
  | NotFoundOrUnavailable;

export async function addComment(
  cardPublicId: string,
  body: string,
  backendToken: string,
): Promise<AddCommentResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/comments`, backendToken, {
    method: "POST",
    body: { body },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 201) return { ok: true, data: result.payload as ActivityEntry };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type GetActivityResult = { ok: true; data: CursorPage<ActivityEntry> } | NotFoundOrUnavailable;

export async function getActivity(
  cardPublicId: string,
  input: { cursor?: string; limit?: number },
  backendToken: string,
): Promise<GetActivityResult> {
  const query = new URLSearchParams();
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.limit) query.set("limit", String(input.limit));
  const suffix = query.toString();

  const result = await callCardsApi(
    `/v1/cards/${cardPublicId}/activity${suffix ? `?${suffix}` : ""}`,
    backendToken,
  );
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 200) return { ok: true, data: result.payload as CursorPage<ActivityEntry> };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

// specs/009-card-attachments/contracts/attachments-api.md.
export async function removeAttachment(
  attachmentPublicId: string,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/attachments/${attachmentPublicId}`, backendToken, {
    method: "DELETE",
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type CopyCardResult = { ok: true; data: CardSummary } | NotFoundOrUnavailable | Forbidden;

export async function copyCard(cardPublicId: string, backendToken: string): Promise<CopyCardResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/copy`, backendToken, { method: "POST" });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 201) return { ok: true, data: result.payload as CardSummary };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export async function deleteCard(cardPublicId: string, backendToken: string): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}`, backendToken, { method: "DELETE" });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

// specs/005-drag-drop-ordering/contracts/move-api.md — POST /v1/cards/{id}/move.
export async function moveCard(
  cardPublicId: string,
  listPublicId: string,
  beforeCardPublicId: string | undefined,
  backendToken: string,
): Promise<SimpleMutationResult> {
  const result = await callCardsApi(`/v1/cards/${cardPublicId}/move`, backendToken, {
    method: "POST",
    body: { listPublicId, beforeCardPublicId: beforeCardPublicId ?? null },
  });
  if (!result.reached) return { ok: false, status: "unavailable" };
  if (result.status === 204) return { ok: true };
  if (result.status === 400) return validationFailure(result.payload);
  if (result.status === 403) return { ok: false, status: "forbidden" };
  if (result.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}
