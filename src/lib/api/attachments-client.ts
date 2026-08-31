// Server-only client for specs/009-card-attachments/contracts/attachments-api.md. Unlike
// cards-client.ts's callCardsApi, upload and download carry raw bytes (a multipart request
// body, a binary response body) rather than JSON — forwarded through as-is, never parsed as
// JSON (research.md R-2, plan.md ADR-41). No fixed timeout on either call: a JSON call
// hanging past a few seconds signals a dead connection, but these transfer up to 25 MB of
// caller-supplied data, so duration is a function of file size and the client's network, not
// a health signal.
import type { AttachmentDetail } from "@/lib/api/cards-client";

type NotFoundOrUnavailable = { ok: false; status: "not_found" } | { ok: false; status: "unavailable" };
type Forbidden = { ok: false; status: "forbidden" };
type ValidationFailure = { ok: false; status: "validation"; fieldErrors: Record<string, string[]> };

export type UploadAttachmentResult =
  | { ok: true; data: AttachmentDetail }
  | ValidationFailure
  | NotFoundOrUnavailable
  | Forbidden;

export async function uploadAttachment(
  cardPublicId: string,
  formData: FormData,
  backendToken: string,
): Promise<UploadAttachmentResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) return { ok: false, status: "unavailable" };

  let response: Response;
  try {
    response = await fetch(new URL(`/v1/cards/${cardPublicId}/attachments`, baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${backendToken}` },
      body: formData,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: "unavailable" };
  }

  if (response.status === 201) {
    return { ok: true, data: (await response.json()) as AttachmentDetail };
  }
  if (response.status === 400) {
    const problem = (await response.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
    return { ok: false, status: "validation", fieldErrors: problem?.errors ?? {} };
  }
  if (response.status === 403) return { ok: false, status: "forbidden" };
  if (response.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}

export type DownloadAttachmentResult = { ok: true; response: Response } | NotFoundOrUnavailable;

export async function downloadAttachment(
  attachmentPublicId: string,
  backendToken: string,
): Promise<DownloadAttachmentResult> {
  const baseUrl = process.env.FLOWBOARD_API_URL;
  if (!baseUrl) return { ok: false, status: "unavailable" };

  let response: Response;
  try {
    response = await fetch(new URL(`/v1/attachments/${attachmentPublicId}/content`, baseUrl), {
      headers: { Authorization: `Bearer ${backendToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: "unavailable" };
  }

  if (response.status === 200) return { ok: true, response };
  if (response.status === 404) return { ok: false, status: "not_found" };
  return { ok: false, status: "unavailable" };
}
