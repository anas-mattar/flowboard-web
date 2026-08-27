// Server-only client for specs/002-auth-workspaces/contracts/board-membership-api.md.
// Called only from server/api/routers/board-members.ts (protectedProcedure); attaches
// the caller's backend JWT as Authorization: Bearer — the backend re-resolves the
// caller's actual board access on every call (domain invariant 5), this client never
// makes authorization decisions itself.

export interface MemberUser {
  publicId: string;
  displayName: string;
  initials: string;
  avatarColor: string;
}

export interface Member {
  user: MemberUser;
  role: string;
  isWorkspaceOwner: boolean;
}

export interface PendingInvitation {
  publicId: string;
  email: string;
  role: string;
  invitedBy: string;
}

export interface MembersResponse {
  members: Member[];
  pendingInvitations: PendingInvitation[];
}

const BOARD_API_TIMEOUT_MS = 5_000;

type RawResult = { reached: true; status: number; payload: unknown } | { reached: false };

async function callBoardApi(
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
      signal: AbortSignal.timeout(BOARD_API_TIMEOUT_MS),
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

  return { reached: true, status: response.status, payload };
}

export type ListMembersResult =
  | { ok: true; data: MembersResponse }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "unavailable" };

export async function listMembers(
  boardPublicId: string,
  backendToken: string,
): Promise<ListMembersResult> {
  const result = await callBoardApi(`/v1/boards/${boardPublicId}/members`, backendToken);
  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }
  if (result.status === 200) {
    return { ok: true, data: result.payload as MembersResponse };
  }
  if (result.status === 404) {
    return { ok: false, status: "not_found" };
  }
  return { ok: false, status: "unavailable" };
}

export type InviteMemberResult =
  | { ok: true; kind: "member"; data: Member }
  | { ok: true; kind: "pending"; data: PendingInvitation }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "forbidden" }
  | { ok: false; status: "conflict" }
  | { ok: false; status: "validation"; fieldErrors: Record<string, string[]> }
  | { ok: false; status: "unavailable" };

export async function inviteMember(
  boardPublicId: string,
  input: { email: string; role: string },
  backendToken: string,
): Promise<InviteMemberResult> {
  const result = await callBoardApi(`/v1/boards/${boardPublicId}/invitations`, backendToken, {
    method: "POST",
    body: input,
  });

  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }

  // Contract: 201 for a brand-new member/invitation, 200 when a re-invite updated an
  // existing pending invitation's role in place — the response shape is otherwise
  // identical (a member entry always has "user", a pending invitation never does).
  if (result.status === 201 || result.status === 200) {
    const payload = result.payload as Record<string, unknown> | null;
    if (payload && "user" in payload) {
      return { ok: true, kind: "member", data: payload as unknown as Member };
    }
    return { ok: true, kind: "pending", data: payload as unknown as PendingInvitation };
  }

  if (result.status === 404) {
    return { ok: false, status: "not_found" };
  }
  if (result.status === 403) {
    return { ok: false, status: "forbidden" };
  }
  if (result.status === 409) {
    return { ok: false, status: "conflict" };
  }
  if (result.status === 400) {
    const problem = result.payload as { errors?: Record<string, string[]> } | null;
    return { ok: false, status: "validation", fieldErrors: problem?.errors ?? {} };
  }

  return { ok: false, status: "unavailable" };
}

export type RevokeInvitationResult =
  | { ok: true }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "forbidden" }
  | { ok: false; status: "unavailable" };

export async function revokeInvitation(
  invitationPublicId: string,
  backendToken: string,
): Promise<RevokeInvitationResult> {
  const result = await callBoardApi(`/v1/invitations/${invitationPublicId}`, backendToken, {
    method: "DELETE",
  });

  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }
  if (result.status === 204) {
    return { ok: true };
  }
  if (result.status === 404) {
    return { ok: false, status: "not_found" };
  }
  if (result.status === 403) {
    return { ok: false, status: "forbidden" };
  }
  return { ok: false, status: "unavailable" };
}

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; status: "not_found" }
  | { ok: false; status: "forbidden" }
  | { ok: false; status: "unavailable" };

export async function removeMember(
  boardPublicId: string,
  userPublicId: string,
  backendToken: string,
): Promise<RemoveMemberResult> {
  const result = await callBoardApi(
    `/v1/boards/${boardPublicId}/members/${userPublicId}`,
    backendToken,
    { method: "DELETE" },
  );

  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }
  if (result.status === 204) {
    return { ok: true };
  }
  if (result.status === 404) {
    return { ok: false, status: "not_found" };
  }
  if (result.status === 403) {
    return { ok: false, status: "forbidden" };
  }
  return { ok: false, status: "unavailable" };
}
