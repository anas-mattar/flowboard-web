// Consumer side of specs/001-solution-scaffold/contracts/health-api.md (governance
// repo). Server-only: called from tRPC procedures; FLOWBOARD_API_URL and this module
// must never reach browser code (docs/rulebooks/frontend-rules.md, Data Flow).

export type HealthFailureReason =
  | "not_configured"
  | "network"
  | "timeout"
  | "bad_status"
  | "bad_payload";

export type HealthCheckResult =
  | { ok: true; payload: unknown }
  | { ok: false; reason: HealthFailureReason };

// Contract: consumers treat anything but a timely 200 JSON body as unavailable (FR-004);
// 5 s timeout keeps the page's answer inside the SC-001 bound.
const HEALTH_TIMEOUT_MS = 5_000;

export async function fetchHealthStatus(): Promise<HealthCheckResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) {
    return { ok: false, reason: "not_configured" };
  }

  let response: Response;
  try {
    response = await fetch(new URL("/v1/health", baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    return { ok: false, reason: isTimeout ? "timeout" : "network" };
  }

  if (!response.ok) {
    return { ok: false, reason: "bad_status" };
  }

  try {
    return { ok: true, payload: await response.json() };
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
}
