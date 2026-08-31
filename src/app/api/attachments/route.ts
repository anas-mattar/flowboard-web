// specs/009-card-attachments/contracts/attachments-api.md, research.md R-2 (ADR-41): the
// one deliberate byte-carrying exception to frontend-rules.md's "ALL backend calls go
// through tRPC" — multipart request bodies can't cross tRPC's JSON transport. Everything
// else about this operation (base URL, auth, timeouts, error mapping) still lives here, one
// server-side hop, same as every tRPC procedure.
import { NextResponse } from "next/server";
import { getBackendSession } from "@/lib/auth/session";
import { uploadAttachment } from "@/lib/api/attachments-client";

export async function POST(request: Request) {
  const session = await getBackendSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const cardPublicId = formData.get("cardPublicId");
  const file = formData.get("file");
  if (typeof cardPublicId !== "string" || cardPublicId.length === 0 || !(file instanceof File)) {
    return NextResponse.json(
      { errors: { file: ["cardPublicId and a file are required."] } },
      { status: 400 },
    );
  }

  const forward = new FormData();
  forward.set("file", file);

  const result = await uploadAttachment(cardPublicId, forward, session.backendToken);
  if (result.ok) {
    return NextResponse.json(result.data, { status: 201 });
  }
  if (result.status === "validation") {
    return NextResponse.json({ errors: result.fieldErrors }, { status: 400 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "The FlowBoard backend is unavailable." }, { status: 503 });
}
