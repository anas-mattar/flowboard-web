// specs/009-card-attachments/contracts/attachments-api.md, research.md R-2 (ADR-41). The
// backend response's body is streamed straight through with its own Content-Type/
// Content-Disposition — never buffered fully in memory (plan.md's Performance
// Responsibility note) and never re-parsed as JSON.
import { getBackendSession } from "@/lib/auth/session";
import { downloadAttachment } from "@/lib/api/attachments-client";

interface RouteParams {
  params: Promise<{ attachmentPublicId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getBackendSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { attachmentPublicId } = await params;
  const result = await downloadAttachment(attachmentPublicId, session.backendToken);
  if (!result.ok) {
    return new Response(null, { status: result.status === "not_found" ? 404 : 503 });
  }

  return new Response(result.response.body, {
    status: 200,
    headers: {
      "Content-Type": result.response.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": result.response.headers.get("content-disposition") ?? "attachment",
    },
  });
}
