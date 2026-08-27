// Server-only client for specs/002-auth-workspaces/contracts/auth-api.md. Called from
// the auth.signup tRPC procedure and from NextAuth's Credentials authorize() (both
// server-side only); FLOWBOARD_API_URL and this module must never reach browser code
// (docs/rulebooks/frontend-rules.md, Data Flow).

export interface AuthUser {
  publicId: string;
  email: string;
  displayName: string;
  initials: string;
  avatarColor: string;
}

export interface AuthWorkspace {
  publicId: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  workspace: AuthWorkspace;
  token: string;
  expiresAtUtc: string;
}

export type SignupResult =
  | { ok: true; data: AuthResponse }
  | { ok: false; status: "validation"; fieldErrors: Record<string, string[]> }
  | { ok: false; status: "conflict" }
  | { ok: false; status: "unavailable" };

export type LoginResult =
  | { ok: true; data: AuthResponse }
  | { ok: false; status: "invalid_credentials" }
  | { ok: false; status: "unavailable" };

// Contract: signup/login only ever need to answer quickly; anything slower than this is
// treated as unavailable rather than left hanging.
const AUTH_TIMEOUT_MS = 5_000;

type RawResult = { reached: true; status: number; payload: unknown } | { reached: false };

async function postAuth(path: string, body: unknown): Promise<RawResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) {
    return { reached: false };
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch {
    return { reached: false };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // No/invalid JSON body (e.g. a 204 or a rejection with no ProblemDetails) — the
    // status code alone still drives the caller's branching below.
  }

  return { reached: true, status: response.status, payload };
}

export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<SignupResult> {
  const result = await postAuth("/v1/auth/signup", input);
  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }

  if (result.status === 201) {
    return { ok: true, data: result.payload as AuthResponse };
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

export async function logIn(input: { email: string; password: string }): Promise<LoginResult> {
  const result = await postAuth("/v1/auth/login", input);
  if (!result.reached) {
    return { ok: false, status: "unavailable" };
  }

  if (result.status === 200) {
    return { ok: true, data: result.payload as AuthResponse };
  }

  // FR-004: wrong password and unknown email are indistinguishable at the contract
  // level (both 401) — this client preserves that, it does not try to tell them apart.
  return { ok: false, status: "invalid_credentials" };
}
